import { AccountReviewDto, badRequest, CreateReviewDto, errorMessage, notAvailable, 
    PartialAccountDto, Product, ProductReviewDto, Review, SuccessDto, uuidTransformer } from "@app/lib";
import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from 'uuid';
import { GeneralService } from "./general.service";
import { firstValueFrom } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class ReviewService {
    constructor(
        private readonly generalService: GeneralService,
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){};

    async getAccountReviews(accountId: string): Promise<SuccessDto<AccountReviewDto[]>> {
        const lockKey = `lock:myReviews:${accountId}`;
        const token = uuidv4();
        try {
            const cacheKey = `myReviews:${accountId}`;
            const cached = await this.redis.get(cacheKey).catch(() => {});
            if (cached) {
                return { 
                    success: true, 
                    data: JSON.parse(cached) as AccountReviewDto[]
                };
            } 
            
            const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);
            if (!lock) return;
            
            const reviews = await this.reviewRepository
                .createQueryBuilder('r')
                .innerJoinAndSelect('r.product', 'p')
                .where('r.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .orderBy('r.created', 'DESC')
                .getMany();

            const data = reviews.map((r) => new AccountReviewDto(r));
            if(data.length){
                await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
            }
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(ReviewService.name, err);
        }finally{
            await this.generalService.releaseLock(lockKey, token).catch(() => {});
        }
    }

    async addReview(accountId: string, dto: CreateReviewDto): Promise<SuccessDto<ProductReviewDto>> {
        try {
            const exists = await this.productRepository
                .createQueryBuilder('p')
                .leftJoinAndSelect('p.meta', 'm')
                .where('p.id = :productId', { productId: uuidTransformer.to(dto.productId) })
                .getOne();

            if (!exists) {
                return badRequest;
            }

            if(exists.meta.deletedBy){
                return notAvailable;
            }

            await this.reviewRepository
                .createQueryBuilder()
                .insert()
                .into(Review)
                .values({
                    productId: dto.productId,
                    accountId,
                    rating: dto.rating,
                    comment: dto.comment ?? null
                })
                .execute();

            const cacheKey = `myReviews:${accountId}`;
            await this.redis.del(cacheKey).catch(() => {});
            
            const accountList = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    { cmd: 'get_partial_account_list_info' },
                    { accountIds: [accountId]}
                )
            );
            const account = accountList.data ? accountList.data.pop() : undefined; 
            
            if(!account){
                return {
                    success: true
                };
            };

            return {
                success: true,
                data: new ProductReviewDto(account.username, dto.productId, dto.rating, dto.comment)
            };
        } catch (err: any) {
            if (err?.code === 'ER_DUP_ENTRY') {
                return badRequest;
            }
            return errorMessage(ReviewService.name, err);
        }
    }

    async deleteReview(accountId: string, productId: string): Promise<SuccessDto<void>> {
        try {
            const result = await this.reviewRepository
                .createQueryBuilder()
                .delete()
                .from(Review)
                .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .andWhere('productId = :productId', { productId: uuidTransformer.to(productId) })
                .execute();

            if (result.affected === 0) {
                return badRequest;
            }

            const cacheKey = `myReviews:${accountId}`;
            await this.redis.del(cacheKey).catch(() => {});

            return {
                success: true
            };
        } catch (err: any) {
            return errorMessage(ReviewService.name, err);
        }
    }
}