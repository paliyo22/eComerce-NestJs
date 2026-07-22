import { errorMessage, MetaP, notFound, PartialProductDto, Product, SuccessDto, uuidTransformer } from "@app/lib";
import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from 'uuid';
import { GeneralService } from "./general.service";
import { firstValueFrom } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class AdminService {
    constructor(
        private readonly generalService: GeneralService,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(MetaP)
        private readonly metaRepository: Repository<MetaP>,
        @Inject('REDIS_CLIENT')
        private redis: Redis,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
    ){};

    @Cron(CronExpression.EVERY_2_HOURS)
    async calculateRating(): Promise<void> {
        const MIN_REVIEWS = 3;
        const DEFAULT_RATING = 8;
        const lockKey = 'lock:calculate_rating';
        const token = uuidv4();

        const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);

        if (!lock) return;
        const queryRunner = this.productRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.query(`
                CREATE TEMPORARY TABLE tmp_avg_rating AS
                SELECT
                    p.id AS product_id,
                    CASE
                        WHEN COALESCE(r.review_count, 0) < ? THEN ?
                        ELSE r.avg_rating
                    END AS final_rating
                FROM product p
                INNER JOIN meta m ON p.id = m.product_id
                LEFT JOIN (
                    SELECT
                        product_id,
                        COUNT(*) AS review_count,
                        ROUND(AVG(rating), 2) AS avg_rating
                    FROM review
                    GROUP BY product_id
                ) r ON p.id = r.product_id
                WHERE m.deleted_by IS NULL
            `, [MIN_REVIEWS, DEFAULT_RATING]);

            await queryRunner.query(`
                UPDATE product p
                INNER JOIN tmp_avg_rating t ON p.id = t.product_id
                SET p.rating_avg = t.final_rating
            `);

            await queryRunner.query(`DROP TEMPORARY TABLE IF EXISTS tmp_avg_rating`);
        } catch (err: any) {
            errorMessage(AdminService.name, err);
        } finally {
            await queryRunner.release();
            await this.generalService.releaseLock(lockKey, token).catch(() => {});
        }
    };
  
    async banProduct(adminId: string, productId: string): Promise<SuccessDto<void>> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'is_admin'},
                    { adminId }
                )
            );
            
            if(!result.success){
                return {
                    success: false,
                    code: result.code,
                    message: result.message
                }
            };

            const product = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .where('p.id = :id', { id: uuidTransformer.to(productId) })
                .getOne();

            if (!product) {
                return notFound;
            }

            await this.metaRepository
                .createQueryBuilder()
                .update(MetaP)
                .set({ deletedBy: adminId, deleted: new Date() })
                .where('productId = :productId', { productId: uuidTransformer.to(productId) })
                .execute();
            
            this.generalService.deleteCache('product', productId);
            this.generalService.deleteCache('featured');

            this.generalService.deleteFromCarts([productId]);

            return {
                success: true
            }; 
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    };
 
    async unbanProduct(adminId: string, productId: string): Promise<SuccessDto<void>> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'is_admin'},
                    { adminId }
                )
            );
            
            if(!result.success){
                return {
                    success: false,
                    code: result.code,
                    message: result.message
                }
            };

            const product = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .where('p.id = :id', { id: uuidTransformer.to(productId) })
                .getOne();

            if (!product) {
                return notFound;
            }

            await this.metaRepository
                .createQueryBuilder()
                .update(MetaP)
                .set({ deletedBy: null, deleted: null })
                .where('productId = :productId', { productId: uuidTransformer.to(productId) })
                .execute();

            this.generalService.deleteCache('product', productId);
            
            return {
                success: true
            }; 
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    };

    async getBannedList(adminId: string, limit = 50, offset = 0): Promise<SuccessDto<PartialProductDto[]>> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'is_admin'},
                    { adminId }
                )
            );

            if(!result.success){
                return {
                    success: false,
                    code: result.code,
                    message: result.message
                };
            };

            const products = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .innerJoinAndSelect('p.category', 'c')
                .leftJoinAndSelect('p.tags', 't')
                .leftJoinAndSelect('p.images', 'i')
                .where('m.deletedBy IS NOT NULL')
                .andWhere('m.deletedBy != m.accountId')
                .orderBy('p.ratingAvg', 'DESC')
                .take(limit)
                .skip(offset)
                .getMany();

            return {
                success: true,
                data: products.map((p) => new PartialProductDto(p))
            }
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    };
}