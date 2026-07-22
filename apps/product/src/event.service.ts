import { AccountDto, EAccountStatus, errorMessage, EStateStatus, MetaP, PartialProductDto, ProductOrderDto, 
    Product, Review, SuccessDto, TransactionDto, UnavailableProductsDto, uuidTransformer, withRetry } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneralService } from "./general.service";
import { firstValueFrom, from } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";
import Redis from "ioredis";

@Injectable()
export class EventService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly generalService: GeneralService,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){};

    private readonly logger = new Logger(EventService.name);
    

    async getProductsFromList(productIds: string[]): Promise<SuccessDto<PartialProductDto[]>> {
        try {
            const ids = productIds.map((p) => uuidTransformer.to(p));
            const products = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .innerJoinAndSelect('p.category', 'c')
                .leftJoinAndSelect('p.tags', 't')
                .leftJoinAndSelect('p.images', 'i')
                .where('p.id IN (:...ids)', { ids })
                .andWhere('m.deleted IS NULL')
                .getMany();
        
            if (!products.length) {
                return {
                    success: true,
                    data: []
                };
            };
        
            const data = products.map((p) => new PartialProductDto(p));
        
            return {
                success: true,
                data
            };
        
        } catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }

    async deleteAccountData(accountId: string): Promise<void> {
        try {
            const productIds = await this.productRepository.manager.transaction(async manager => {        
                const products = await manager.createQueryBuilder(Product, 'p')
                    .innerJoinAndSelect('p.meta', 'm')
                    .where('m.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                    .getMany();
            
                const productIds = products.map((p) => p.id);
                const ids = products.map((p) => uuidTransformer.to(p.id));
                
                if(productIds.length){
                    await manager.createQueryBuilder()
                        .update(Product)
                        .set({ stock: 0 })
                        .where('id IN (:...ids)', { ids })
                        .execute();
                    
                    await manager.createQueryBuilder()
                        .update(MetaP)
                        .set({ deletedBy: accountId, deleted: new Date() })
                        .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                        .execute();
            
                    await manager.createQueryBuilder()
                        .delete()
                        .from(Review)
                        .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                        .execute();
                }
        
                return productIds;
            });
    
        if(productIds.length){
            this.generalService.deleteFromCarts(productIds);
        }
        } catch (err: any) {
            this.logger.warn(`Error removing the products from the deleted account ${accountId}`);
        }
    }

    async reserve(products: { productId: string; amount: number; }[]): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
        const answer: {product: Product, accountId: string, accounTitle: string, amount: number}[] = [];
        const unavailable: UnavailableProductsDto[] = [];
        const data: ProductOrderDto[] = [];
        try {
            const ids = products.map((p) => uuidTransformer.to(p.productId));

            const productList = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .where('p.id IN (:...ids)', { ids })
                .getMany();
        
            if(ids.length !== productList.length) return errorMessage(EventService.name);

            const accountIds = Array.from(new Set(productList.map((p) => p.meta.accountId)));
            const accountList = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto[]>>(
                    { cmd: 'get_account_list_info'},
                    { accountIds }
                )
            );
            if(!accountList.success){
                return errorMessage(EventService.name);
            }

            if(accountIds.length !== accountList.data.length) return errorMessage(EventService.name);

            await this.productRepository.manager.transaction(async manager => {
                const prods = await manager.createQueryBuilder(Product, 'p')
                    .innerJoinAndSelect('p.meta', 'm')
                    .setLock('pessimistic_write')
                    .where('p.id IN (:...ids)', { ids })
                    .getMany();

                prods.forEach((p) => {
                    const aux = products.find((e) => e.productId === p.id);
                    if(p.meta.deleted){
                        unavailable.push(new UnavailableProductsDto(p.id, p.title, 'NOT_AVAILABLE'));
                    }else{
                        if(p.stock < aux.amount){
                            unavailable.push(new UnavailableProductsDto(p.id, p.title, 'OUT_OF_STOCK'));
                        }else{
                            const acc = accountList.data.find((a) => p.meta.accountId === a.id);
                            if(acc.status !== EAccountStatus.Active){
                                unavailable.push(new UnavailableProductsDto(p.id, p.title, 'INNACTIVE_ACCOUNT'));
                            }else{
                                p.stock -= aux.amount;
                                if(acc.businessProfile){
                                    answer.push({product: p, accountId: acc.id, accounTitle: acc.businessProfile.title, amount: aux.amount});
                                }else {
                                    answer.push({product: p, accountId: acc.id, accounTitle: acc.username, amount: aux.amount});
                                };
                            }
                        }
                    }
                });

                if(unavailable.length){
                    throw new Error('UNAVAILABLE');
                };

                await manager.save(Product, prods);
            });

            answer.forEach((i) => {
                data.push(new ProductOrderDto(i.product, i.accountId, i.accounTitle, i.amount));
            });

            return {
                success: true,
                data
            }
        } catch (err: any) {
            if(err.message === 'UNAVAILABLE'){
                return {
                    success: false,
                    data: unavailable
                }
            }
            return errorMessage(EventService.name, err);
        }
    }

    async restoreStock(productIds: {productId: string, amount: number}[], token: TransactionDto): Promise<void> {
        const failures: { id: string; amount: number; error: any }[] = [];
        const cacheKey = `transaction:${token.uuid}`;
    
        for (const p of productIds) {
            try {
                let attempts = 0;
                const maxAttempts = 3;
                while (attempts < maxAttempts) {
                    try {
                        await this.productRepository.manager.transaction(async manager => {
                            const product = await manager.createQueryBuilder(Product, 'p')
                                .innerJoinAndSelect('p.meta', 'm')
                                .where('p.id = :id', { id: uuidTransformer.to(p.productId) })
                                .getOne();
                
                            if(!product.meta.deletedBy){
                                await manager.increment(Product, { id: p.productId }, 'stock', p.amount);
                            };
                        });
                        break;
                    } catch (err: any) {
                        attempts++;
                        if (attempts >= maxAttempts) {
                            throw err;
                        }
                        await new Promise((res) => setTimeout(res, 100 * attempts));
                    }
                }
            } catch (err: any) {
                failures.push({id: p.productId, amount: p.amount, error: err?.message ?? err})
            }
        };
        
        if(failures.length){
            this.logger.fatal(`restoreStock failed ${failures.length} times:`, failures);
        };
        token.status = EStateStatus.Completed;
        await firstValueFrom(
            from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
            .pipe(withRetry(3))
        ).catch(() => {});
        const lock = `lock:${token.uuid}`;
        await this.generalService.releaseLock(lock, token.uuid);
        await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
    }

    async isActive(productId: string): Promise<SuccessDto<void>> {
        try {
            const result = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .where('p.id = :id', { id: uuidTransformer.to(productId) })
                .getOne();
            
            if(!result) return { success: false };
        
            if(!result.meta.deleted){
                return { success: true };
            }else{
                return { success: false };
            }
        } catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }

    async getAccountProducts (id: string): Promise<SuccessDto<PartialProductDto[]>> {
        try {
            const cacheKey = `accountProducts:${id}`;
            const cached = await this.redis.get(cacheKey).catch(() => {});
            if (cached) {
                return { 
                    success: true, 
                    data: JSON.parse(cached) as PartialProductDto[] 
                };
            }
            const products = await this.productRepository
                .createQueryBuilder('p')
                .innerJoinAndSelect('p.meta', 'm')
                .innerJoinAndSelect('p.category', 'c')
                .leftJoinAndSelect('p.tags', 't')
                .leftJoinAndSelect('p.images', 'i')
                .where('m.accountId = :accountId', { accountId: uuidTransformer.to(id) })
                .andWhere('m.deletedBy IS NULL OR m.deletedBy = m.accountId')
                .getMany();
        
            if (!products.length) {
                return { 
                    success: true, 
                    data: []
                };
            }
        
            const data = products.map((p) => new PartialProductDto(p));
            if(data.length){
                await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
            }
            return { 
                success: true, 
                data
            };
        } catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }
}