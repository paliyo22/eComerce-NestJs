import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuccessDto, OrderDto, DraftOrder, OrderItem, Order, DraftOrderOutputDto, 
  CreateDraftOrderDto, withRetry, ProductOrderDto, DraftItem, EStateStatus, 
  PartialOrderDto, SaleDto, UnavailableProductsDto, errorMessage, badRequest, 
  unauthorized, notFound, expired, MoneyVariations, PartialAccountDto, TransactionDto,
  uuidTransformer } from '@app/lib';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, from } from 'rxjs';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OrderService {
  constructor(
    private readonly config: ConfigService, 
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(DraftOrder)
    private readonly draftRepo: Repository<DraftOrder>,
    @Inject('CART_SERVICE')
    private readonly cartClient: ClientProxy,
    @Inject('PRODUCT_SERVICE')
    private readonly productClient: ClientProxy,
    @Inject('ACCOUNT_SERVICE')
    private readonly accountClient: ClientProxy,
    @Inject('REDIS_CLIENT')
    private redis: Redis
  ) {
    this.subscriber = this.redis.duplicate();
    this.setupGlobalSubscriber();
  }

  private subscriber: Redis;

  private responseEmitter = new EventEmitter();

  private setupGlobalSubscriber() {
    const pattern = 'transaction:done:*';
    this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (_, channel, message) => {
      this.responseEmitter.emit(channel, message);
    });
    this.subscriber.on('error', (err) => {
      this.logger.error('Global subscriber error', err);
    });
  }

  private readonly logger = new Logger(OrderService.name);

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(luaScript, 1, lockKey, token).catch(() => {});
  }

  private async waitForTransaction(token: TransactionDto, timeoutMs: number): Promise<'completed' | 'failed'> {    
    return new Promise((resolve) => {
      const channel = `transaction:done:${token.uuid}`;
      const handleMessage = (status: string) => {
        cleanup();
        resolve(status === EStateStatus.Completed ? 'completed' : 'failed');
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.responseEmitter.removeListener(channel, handleMessage);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve('failed');
      }, timeoutMs);

      this.responseEmitter.on(channel, handleMessage);
    });
  }

  private async restoreStock(products: {productId: string, amount: number}[]): Promise<void> {
    const token = new TransactionDto(uuidv4(), true, EStateStatus.Pending);
    const cacheKey = `transaction:${token.uuid}`;
    try {
      await firstValueFrom(
        this.productClient.send<void>(
          { cmd: 'restore_stock' },
          { products, token }
        ).pipe(withRetry(5, 60000, this.config.get<number>('MESSAGE_TIMEOUT')))
      );
    } catch (err: any) {
      const cache = await this.redis.get(cacheKey).catch(() => undefined);
      if(cache){
        const transaction = JSON.parse(cache) as TransactionDto;
        if(transaction.status !== EStateStatus.Completed){
          this.logger.fatal(`The stock of some products could not be restore: ${products}`);
        }
      }else{
        this.logger.warn(`Error traceing the restore of some products stock: ${products}`);
      };
    }
  }

  private async deleteProductsFromCart(accountId: string, items: OrderItem[]): Promise<void> {
    await firstValueFrom(
      this.cartClient.send<void>(
        { cmd: 'delete_products_from_cart' },
        { accountId, items }
      )
    ).catch((err) => {
      this.logger.error(`Error trying to delete the products from cart after the purchase`, err);
    });
  }  

  private async addToBalance(items: OrderItem[]): Promise<void> {
    const token = new TransactionDto(uuidv4(), true, EStateStatus.Pending);
    const cacheKey = `transaction:${token.uuid}`;
    const accountBalance = items.reduce((acc, i) => {
      if(!acc[i.sellerId]) {
        acc[i.sellerId] = {
          accountId: i.sellerId, 
          orderId: i.orderId,
          balance: 0
        };
      };

      acc[i.sellerId].balance += i.subtotal;
      return acc 
    }, {});

    const balance = Object.values(accountBalance);

    try {
      await firstValueFrom(
        this.accountClient.send<void>(
          { cmd: 'add_to_account_balance' },
          { accounts: balance, token }
        ).pipe(withRetry(5, 60000, this.config.get<number>('MESSAGE_TIMEOUT')))
      );
    } catch (err) {
      const cache = await this.redis.get(cacheKey).catch(() => undefined);
      if(cache){
        const transaction = JSON.parse(cache) as TransactionDto;
        if(transaction.status !== EStateStatus.Completed){
          this.logger.fatal(`The money of some accounts could not be increased. Code: ${token.uuid} \n Transactions: ${balance}`);
        }
      }else{
        this.logger.warn(`Error traceing the increase of some accounts balance. Code: ${token.uuid} \n Transactions: ${balance}`);
      };
    }
  }

  private getDefaultDateRange(since: Date){
    if(since.getDate() <= 10){
      if(since.getMonth() === 0){
        since.setFullYear(since.getFullYear() - 1, 11, 1);
      }else{
        since.setMonth(since.getMonth() - 1);
      }
    }
    since.setDate(1);
  }
  
  async check(token: TransactionDto): Promise<'completed' | 'failed' | 'try'> {
    const timeout = token.isInternal ? (this.config.get<number>('MESSAGE_TIMEOUT') + 1000) : 3100;
    const cacheKey = `transaction:${token.uuid}`;
    const cached = await firstValueFrom(from(this.redis.get(cacheKey)).pipe(withRetry(3))).catch(() => undefined);
    const lock = `lock:${token.uuid}`;
    const locked = await this.redis.set(lock, token.uuid, 'EX', 100, 'NX').catch(() => undefined);
    if(!locked){
      return await this.waitForTransaction(token, timeout);
    }else{
      if(cached){
        const result = JSON.parse(cached) as TransactionDto;
        if(result.status !== EStateStatus.Pending){
          const lock = `lock:${token.uuid}`;
          await this.releaseLock(lock, token.uuid).catch(() => {});    
          return result.status === EStateStatus.Completed ? 'completed' : 'failed';
        }
      }else{
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
          .pipe(withRetry(3)))
          .catch(() => {});
      };
      return 'try';
    } 
  }

  async createDraftOrder(accountId: string, dto: CreateDraftOrderDto): Promise<SuccessDto<DraftOrderOutputDto | UnavailableProductsDto[]>> {
    let productIds: {productId: string, amount: number}[] = [];
    try {
      const shippingAddress = `${dto.address} ${dto.apartment ?? ''} | ${dto.zip} | ${dto.city}, ${dto.country}.`;
      const accounts = await firstValueFrom(
        this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
          { cmd: 'get_partial_account_list_info' },
          { accountIds: [accountId] }
        )
      );

      const account = accounts.data?.pop();
      if(!account){
        return errorMessage();
      }

      let result: SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>; 

      if(dto.fromCart){
        result = await firstValueFrom(
          this.cartClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
            { cmd: 'reserve' },
            { accountId, cartId: dto.fromCart.cartId, cartProductId: dto.fromCart.cartProductId }
          )
        );
      } else {
        if(dto.fromProduct.amount <= 0 ) return badRequest;

        result = await firstValueFrom(
          this.productClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
            { cmd: 'reserve' },
            { products: [dto.fromProduct] }
          )
        ); 
      };

      if(!result){
        return errorMessage();
      };

      if(!result.success){
        if(!result.data){
          return {
            success: false,
            code: result.code,
            message: result.message
          }
        }else{
          return {
            success: false,
            data: result.data as UnavailableProductsDto[]
          }
        }
      };

      const productOrder = result.data! as ProductOrderDto[];
      productIds = productOrder.map((i) => {
          return {
            productId: i.productId,
            amount: i.amount
          };
        });
      let total = 0;
      productOrder.forEach((i) => {
        total =  (Math.round(total * 100) + Math.round(((i.amount * Math.round(i.price * 100)) / 100) * (1 - i.discountPercentage / 100) * 100)) / 100;
      });

      const draftOrder = await this.draftRepo.manager.transaction(async manager => {
        const createDraftOrder = manager.create(DraftOrder, {
          accountId: accountId,
          total: total,
          shippingAddress,
          contactEmail: account.email
        }); 
        const draft = await manager.save(createDraftOrder, {reload: false});
    
        const items = manager.create(DraftItem, productOrder.map((i) => {
          return{
            draftOrderId: createDraftOrder.id,
            productId: i.productId,
            productTitle: i.productTitle,
            sellerId: i.sellerId,
            sellerTitle: i.sellerTitle,
            price: i.price,
            amount: i.amount,
            discountPercentage: i.discountPercentage,
            subtotal: Math.round(((i.amount * Math.round(i.price * 100)) / 100) * (1 - i.discountPercentage / 100) * 100) / 100
          }
        }))
        const draftItems = await manager.save(items, { reload: false });
        draft.items = draftItems;

        return draft;
      });

      const data = new DraftOrderOutputDto(draftOrder);

      this.draftRepo.createQueryBuilder('d')
        .leftJoinAndSelect('d.items', 'i')
        .where('d.id = :id', { id: uuidTransformer.to(draftOrder.id) })
        .getOne()
        .then((draft) => {
          if(draft){
            const cacheKey = `draftOrder:${draft.id}`;
            return this.redis.set(cacheKey, JSON.stringify(draft), 'EX', 30);
          }
        }).catch((err) => this.logger.warn(`No se pudo repoblar cache de draftOrder ${draftOrder.id}: ${err?.message ?? err}`));
      

      return {
        success: true,
        data
      }
    } catch (err: any) {
      if(productIds.length){
        this.restoreStock(productIds);
      };
      return errorMessage(OrderService.name, err);
    }
  }

  async getDraftOrderStatus(draftOrderId: string): Promise<SuccessDto<EStateStatus>> {
    try {
      const result = await this.draftRepo.manager.transaction(async manager => {
        const draft = await manager
          .createQueryBuilder(DraftOrder, 'd')
          .where('d.id = :draftOrderId', { draftOrderId: uuidTransformer.to(draftOrderId) })
          .getOne();

        if(!draft) return notFound;
        
        if(draft.status === EStateStatus.Completed){
          await manager.createQueryBuilder()
            .delete()
            .from(DraftOrder)
            .where('id = :draftOrderId', { draftOrderId: uuidTransformer.to(draftOrderId) })
            .execute()
        }

        return {
          success: true,
          data: draft.status 
        };
      });
        
      return result;
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  async getDraftOrder(accountId: string, draftOrderId: string): Promise<SuccessDto<DraftOrder>> {
    try {
      const cacheKey = `draftOrder:${draftOrderId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      
      let draft: DraftOrder | undefined = undefined;
      if(cached){
        draft = JSON.parse(cached) as DraftOrder;
      }else{
        draft = await this.draftRepo
          .createQueryBuilder()
          .where('id = :draftOrderId', { draftOrderId: uuidTransformer.to(draftOrderId) })
          .getOne();
      }

      if (!draft) {
        return notFound
      };

      if(draft.accountId !== accountId){
        return unauthorized;
      };

      const limit = new Date();
      limit.setTime(limit.getTime() - this.config.get<number>('PAYMENT_TIME'));

      if(new Date(draft.created) < limit){
        return expired;
      };     

      return {
        success: true,
        data: draft
      };
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  async cancelDraftOrder(draftOrderId: string, token: TransactionDto, accountId?: string): Promise<SuccessDto<void>> {
    const cacheKey = `transaction:${token.uuid}`;
    try {
      const draft = await this.draftRepo.manager.transaction(async manager => {
        const draftOrder = await manager.createQueryBuilder(DraftOrder, 'd')
          .leftJoinAndSelect('d.items', 'i')
          .where('d.id = :id', { id: uuidTransformer.to(draftOrderId) })
          .getOne();
        
        if(!draftOrder)
          return undefined;
        if(accountId && accountId !== draftOrder.accountId) 
          return undefined;

        await manager.createQueryBuilder()
          .update(DraftOrder)
          .set({ status: EStateStatus.Failed })
          .where('id = :id', { id: uuidTransformer.to(draftOrderId) })
          .execute();

        return draftOrder;
      });
        
      if(!draft){
        token.status = EStateStatus.Failed;
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
          .pipe(withRetry(3)))
          .catch(() => {});
        return unauthorized;
      };
      
      const productIds = draft.items.map((i) => {
        return {
          productId: i.productId,
          amount: i.amount
        }
      });

      this.restoreStock(productIds);

      await this.redis.del(`draftOrder:${draftOrderId}`).catch(() => {});

      token.status = EStateStatus.Completed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});      

      return {success: true}
    } catch (err: any) {
      token.status = EStateStatus.Failed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});
      
      return errorMessage(OrderService.name, err);
    }finally {
      const lock = `lock:${token.uuid}`;
      await this.releaseLock(lock, token.uuid);
      await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});      
    }
  }

  async setOrder(draftOrderId: string, token: TransactionDto, accountId?: string): Promise<SuccessDto<void>> {
    const cacheKey = `transaction:${token.uuid}`;
    try {
      const draftOrder = await this.draftRepo
        .createQueryBuilder('d')
        .innerJoinAndSelect('d.items', 'i')
        .where('d.id = :id', { id: uuidTransformer.to(draftOrderId) })
        .getOne();

      if(!draftOrder){
        token.status = EStateStatus.Failed;
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
          .pipe(withRetry(3)))
          .catch(() => {});
        return unauthorized;
      }

      if(accountId){ 
        if(accountId !== draftOrder.accountId){
          token.status = EStateStatus.Failed;
          await firstValueFrom(
            from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
            .pipe(withRetry(3)))
            .catch(() => {});
          return unauthorized;
        };
        if(Number(draftOrder.total) !== 0){
          token.status = EStateStatus.Failed;      
          await firstValueFrom(
            from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
            .pipe(withRetry(3)))
            .catch(() => {});      
          return unauthorized;
        }
      };

      const items = await this.orderRepo.manager.transaction(async manager => {
        const order = manager.create(Order, {
          accountId: draftOrder.accountId,
          draftOrderId: draftOrder.id,
          total: draftOrder.total,
          shippingAddress: draftOrder.shippingAddress,
          contactEmail: draftOrder.contactEmail
        }); 
        await manager.save(order, { reload: false });

        const items = manager.create(OrderItem, draftOrder.items.map((i) => {
          return {
            orderId: order.id,
            productId: i.productId,
            sellerId: i.sellerId,
            productTitle: i.productTitle,
            sellerTitle: i.sellerTitle,
            price: i.price,
            amount: i.amount,
            discountPercentage: i.discountPercentage,
            subtotal: i.subtotal
          }
        }));

        await manager.createQueryBuilder()
          .update(DraftOrder)
          .set({ status: EStateStatus.Completed, orderId: order.id })
          .where('id = :id', { id: uuidTransformer.to(draftOrderId) })
          .execute();
        return await manager.save(items, { reload: false });
      });

      if(Number(draftOrder.total) !== 0){
        this.addToBalance(items);
      };

      this.deleteProductsFromCart(draftOrder.accountId, items);
      await this.redis.del(`draftOrder:${draftOrderId}`).catch(() => {});

      token.status = EStateStatus.Completed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});
      
      return {success: true};
    } catch (err: any) {
      token.status = EStateStatus.Failed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});
      
      return errorMessage(OrderService.name, err);
    }finally {
      const lock = `lock:${token.uuid}`;
      await this.releaseLock(lock, token.uuid);
      await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
    }
  }

  async getOrder(accountId: string, orderId?: string, draftOrderId?: string): Promise<SuccessDto<OrderDto>>{
    try {
      if((!orderId && !draftOrderId) || (orderId && draftOrderId)){
        return badRequest;
      };

      const order = orderId
        ? await this.orderRepo.createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'i')
            .where('o.id = :id', { id: uuidTransformer.to(orderId) })
            .getOne()
        : await this.orderRepo.createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'i')
            .where('o.draftOrderId = :id', { id: uuidTransformer.to(draftOrderId) })
            .getOne();

      if(!order){
        return notFound;
      };

      if(order.accountId !== accountId){
        return unauthorized;
      };

      return {
        success: true,
        data: new OrderDto(order)
      }
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }
  
  async getShoppingList(accountId: string): Promise<SuccessDto<PartialOrderDto[]>> {
    try {
      const cacheKey = `shoppingList:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialOrderDto[] 
        };
      }
      const orders = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .orderBy('o.created', 'DESC')
        .getMany();

      const data = orders.map((o) => new PartialOrderDto(o));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      }

      return {
        success: true,
        data
      }
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  async getSalesList(accountId: string): Promise<SuccessDto<SaleDto[]>> {
    try {
      const cacheKey = `salesList:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as SaleDto[] 
        };
      }
      const sales = await this.orderItemRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.order', 'o')
        .where('i.sellerId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .orderBy('o.created', 'DESC')
        .getMany();

      const data = sales.map((i) => new SaleDto(i));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      }

      return {
        success: true,
        data
      }
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  async getOutgo(accountId: string, since?: Date, until?: Date): Promise<SuccessDto<MoneyVariations>> {
    try {
      if(!since && until){
        return badRequest;
      }else if(!since && !until){
        since = new Date();
        until = new Date();
        this.getDefaultDateRange(since);
      }else if(since && !until){
        since = new Date(since);
        until = new Date();
      }else{
        since = new Date(since);
        until = new Date(until);
      };
      
      const shoppings = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .andWhere('o.created BETWEEN :since AND :until', { since, until })
        .getMany();

      let totalCents = 0; 
      shoppings.forEach((o) => {
        totalCents += Math.round(Number(o.total) * 100);
      });
      const total = totalCents / 100;

      return {
        success: true,
        data: new MoneyVariations(since, until, total)
      }
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  async getIncome(accountId: string, since?: Date, until?: Date): Promise<SuccessDto<MoneyVariations>> {
    try {
      if(!since && until){
        return badRequest;
      }else if(!since && !until){
        since = new Date();
        until = new Date();
        this.getDefaultDateRange(since);
      }else if(since && !until){
        since = new Date(since);
        until = new Date();
      }else{
        since = new Date(since);
        until = new Date(until);
      };

      const sales = await this.orderItemRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.order', 'o')
        .where('i.sellerId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .andWhere('o.created BETWEEN :since AND :until', { since, until })
        .getMany();

      let totalCents = 0; 
      sales.forEach((i) => {
        totalCents += Math.round(Number(i.subtotal) * 100);
      });
      const total = totalCents / 100;

      return {
        success: true,
        data: new MoneyVariations(since, until, total)
      }
    } catch (err: any) {
      return errorMessage(OrderService.name, err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanDraftOrders(): Promise<void> {
    const lockKey = 'lock:clean_draft_orders';
    const token = uuidv4();
    const lock = await this.redis.set(lockKey, token, 'EX', 100, 'NX').catch(() => undefined);

    if (!lock) return;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    try{      
      await this.draftRepo.createQueryBuilder()
        .delete()
        .from(DraftOrder)
        .where('created < :date', { date: oneWeekAgo })
        .execute();
    } catch (err: any) {
      errorMessage(OrderService.name, err);
    } finally {
      await this.releaseLock(lockKey, token).catch(() => {});
    }
  }







  //-------------------- TEST ------------------------------------------------

  async createTestPurchase(accountId: string, draftOrderId: string): Promise<SuccessDto<void>>{
    try {
      const draftOrder = await this.draftRepo
        .createQueryBuilder('d')
        .innerJoinAndSelect('d.items', 'i')
        .where('d.id = :id', { id: uuidTransformer.to(draftOrderId) })
        .getOne();

      if(!draftOrder){
        return badRequest;
      };
         
      if(accountId !== draftOrder.accountId){
        return unauthorized;
      };

      const items = await this.orderRepo.manager.transaction(async manager => {
        const order = manager.create(Order, {
          accountId: draftOrder.accountId,
          draftOrderId: draftOrder.id,
          total: draftOrder.total,
          shippingAddress: draftOrder.shippingAddress,
          contactEmail: draftOrder.contactEmail
        }); 
        await manager.save(order, { reload: false });

        const items = manager.create(OrderItem, draftOrder.items.map((i) => {
          return {
            orderId: order.id,
            productId: i.productId,
            sellerId: i.sellerId,
            productTitle: i.productTitle,
            sellerTitle: i.sellerTitle,
            price: i.price,
            amount: i.amount,
            discountPercentage: i.discountPercentage,
            subtotal: i.subtotal
          }
        }));

        await manager.createQueryBuilder()
          .update(DraftOrder)
          .set({ status: EStateStatus.Completed, orderId: order.id })
          .where('id = :id', { id: uuidTransformer.to(draftOrderId) })
          .execute();
          
        return await manager.save(items, { reload: false });
      });

      if(Number(draftOrder.total) !== 0){
        this.addToBalance(items);
      };

      this.deleteProductsFromCart(draftOrder.accountId, items);
      await this.redis.del(`draftOrder:${draftOrderId}`).catch(() => {});

      return {success: true};
    } catch (err) {
      return errorMessage(OrderService.name, err);
    }
  }
}
