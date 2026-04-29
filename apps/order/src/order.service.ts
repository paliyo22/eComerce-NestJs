import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuccessDto, OrderDto, DraftOrder, OrderItem, Order, DraftOrderOutputDto, 
  CreateDraftOrderDto, withRetry, ProductOrderDto, DraftItem, EStateStatus, 
  PartialOrderDto, SaleDto, UnavailableProductsDto, errorMessage, badRequest, 
  unauthorized, notFound, expired, MoneyVariations, PartialAccountDto } from '@app/lib';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

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
  ){}

  private async restoreStock(products: {id: string, amount: number}[]): Promise<void>{
    try {
      await firstValueFrom(
        this.productClient.send<void>(
          { cmd: 'restore_stock' },
          { products }
        ).pipe(withRetry())
      );
    } catch (err: any) {
      errorMessage(err);
    }
  }

  async createDraftOrder(accountId: string, dto: CreateDraftOrderDto): Promise<SuccessDto<DraftOrderOutputDto | UnavailableProductsDto[]>> {
    let productIds: {id: string, amount: number}[] = [];
    try {
      const shippingAddress = `${dto.address} ${dto.apartment} \n${dto.zip}, ${dto.city}, ${dto.country}`;
      const accounts = await firstValueFrom(
        this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
          { cmd: 'get_partial_account_list_info' },
          { accountIds: [accountId] }
        ).pipe(withRetry())
      );

      const account = accounts.data?.pop();
      if(!account){
        return errorMessage();
      }

      let result: SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]> | undefined = undefined; 

      if(dto.fromCart){
        result = await firstValueFrom(
          this.cartClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
            { cmd: 'reserve' },
            { accountId, cartId: dto.fromCart.cartId, cartProductId: dto.fromCart.cartProductId }
          ).pipe(withRetry())
        );
      } else {
        if(dto.fromProduct.amount <= 0 ) return badRequest;

        result = await firstValueFrom(
          this.productClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
            { cmd: 'reserve' },
            { products: [dto.fromProduct] }
          ).pipe(withRetry())
        ); 
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

      const productOrder = result.data as ProductOrderDto[];
      productIds = productOrder.map((i) => {
          return {
            id: i.productId,
            amount: i.amount
          };
        });
      let total = 0;
      productOrder.forEach((i) => {
        total += i.getSubTotal();
      });

      const draftOrder = await this.orderRepo.manager.transaction(async manager => {
        const createDraftOrder = await manager.save(DraftOrder, {
          accountId: accountId,
          total: total,
          shippingAddress,
          contactEmail: account.email
        });

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
            subtotal: i.getSubTotal()
          }
        }))
        await manager.save(DraftItem, items);

        return createDraftOrder;
      });

      const data = new DraftOrderOutputDto(draftOrder);
      const cacheKey = `draftOrder:${draftOrder.id}`;
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30);

      return {
        success: true,
        data
      }
    } catch (err: any) {
      if(productIds.length){
        await this.restoreStock(productIds);
      };
      return errorMessage(err);
    }
  }

  async getDraftOrderStatus(draftOrderId: string): Promise<SuccessDto<EStateStatus>> {
    try {
      const result = await this.draftRepo.manager.transaction(async manager => {
        const draft = await manager
          .createQueryBuilder(DraftOrder, 'd')
          .where('d.id = :draftOrderId', { draftOrderId })
          .getOne();

        if(!draft) return notFound;
        
        if(draft.status !== EStateStatus.Pending){
          await manager.createQueryBuilder(DraftOrder, 'd')
            .delete()
            .where('d.id = :draftOrderId', { draftOrderId })
            .execute()
        }

        return {
          success: true,
          data: draft.status 
        };
      })
        
      return result;
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async getDraftOrder(accountId: string, draftOrderId: string): Promise<SuccessDto<DraftOrder>> {
    try {
      const cacheKey = `draftOrder:${draftOrderId}`;
      const cached = await this.redis.get(cacheKey);
      
      let draft: DraftOrder | undefined = undefined;
      if(cached){
        draft = JSON.parse(cached) as DraftOrder 
      }else{
        draft = await this.draftRepo
          .createQueryBuilder('d')
          .where('d.id = :draftOrderId', { draftOrderId })
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
      return errorMessage(err);
    }
  }

  async cancelDraftOrder(draftOrderId: string, accountId?: string): Promise<SuccessDto<void>>{
    try {
      const draft = await this.draftRepo.manager.transaction(async manager => {
        const draftOrder = await manager.createQueryBuilder(DraftOrder, 'd')
          .leftJoinAndSelect('d.items', 'i')
          .where('d.id = :id', { id: draftOrderId })
          .getOne();
        
        if(!draftOrder)
          return undefined;
        if(accountId && accountId !== draftOrder.accountId) 
          return undefined;

        await manager.createQueryBuilder(DraftOrder, 'd')
          .update(DraftOrder)
          .set({ status: EStateStatus.Failed })
          .where('d.id = :id', { id: draftOrderId })
          .execute();

        return draftOrder;
      });
        
      if(!draft){
        return unauthorized;
      };
      
      const productIds = draft.items.map((i) => {
        return {
          id: i.productId,
          amount: i.amount
        }
      });

      await this.restoreStock(productIds);

      await this.redis.del(`draftOrder:${draftOrderId}`);

      return {success: true}
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async setOrder(draftOrderId: string, accountId?: string): Promise<SuccessDto<void>> {
    try {
      const draftOrder = await this.draftRepo
        .createQueryBuilder('d')
        .innerJoinAndSelect('d.items', 'i')
        .where('d.id = :id', { id: draftOrderId })
        .getOne();

      if(accountId){ 
        if(accountId !== draftOrder.accountId){
          return unauthorized;
        }else{
          if(draftOrder.total !== 0){
            return unauthorized;
          }
        }
      };

      const items = await this.orderRepo.manager.transaction(async manager => {
        await manager.createQueryBuilder(DraftOrder, 'd')
          .update(DraftOrder)
          .set({ status: EStateStatus.Completed })
          .where('d.id = :id', { id: draftOrderId })
          .execute();

        const order = await manager.save(Order, {
          accountId: draftOrder.accountId,
          draftOrderId: draftOrder.id,
          total: draftOrder.total,
          shippingAddress: draftOrder.shippingAddress,
          contactEmail: draftOrder.contactEmail
        });

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
        return await manager.save(OrderItem, items);
      });

      const accountBalance = items.reduce((acc, i) => {
        if(!acc[i.sellerId]) {
          acc[i.sellerId] = {accountId: i.sellerId, balance: 0};
        };
        acc[i.sellerId].balance += i.subtotal;
        return acc 
      }, {});

      const balance = Object.values(accountBalance);

      await firstValueFrom(
        this.accountClient.send<void>(
          { cmd: 'add_to_account_balance' },
          { accounts: balance }
        ).pipe(withRetry())
      );

      await this.redis.del(`draftOrder:${draftOrderId}`);
      return {success: true};
    } catch (err: any) {
      return errorMessage(err);
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
            .where('o.id = :id', { id: orderId })
            .getOne()
        : await this.orderRepo.createQueryBuilder('o')
            .leftJoinAndSelect('o.items', 'i')
            .where('o.draftOrderId = :id', { id: draftOrderId })
            .getOne();

      if(!order){
        return {
          success: false,
          code: 404,
          message: 'Order not found.'
        };
      };

      if(order.accountId !== accountId){
        return unauthorized;
      };

      return {
        success: true,
        data: new OrderDto(order)
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }
  
  async getShoppingList(accountId: string): Promise<SuccessDto<PartialOrderDto[]>> {
    try {
      const cacheKey = `shoppingList:${accountId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as PartialOrderDto[] 
        };
      }
      const orders = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.accountId = :accountId', { accountId })
        .getMany();

      const data = orders.map((o) => new PartialOrderDto(o));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30);
      }

      return {
        success: true,
        data
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async getSalesList(accountId: string): Promise<SuccessDto<SaleDto[]>> {
    try {
      const cacheKey = `salesList:${accountId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as SaleDto[] 
        };
      }
      const sales = await this.orderItemRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.order', 'o')
        .where('i.sellerId = :accountId', { accountId })
        .getMany();

      const data = sales.map((i) => new SaleDto(i));
      if(data.length){
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30);
      }

      return {
        success: true,
        data
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async getOutgo(accountId: string, since?: Date, until?: Date): Promise<SuccessDto<MoneyVariations>> {
    try {
      if(!since && until){ // no puedo asumir el since solo con esta informacion.
        return badRequest;
      };

      if(!since && !until){
        since = new Date();
        until = new Date();
        if(since.getDate() === 1){
          if(since.getMonth() === 0){
            since.setFullYear(since.getFullYear() - 1, 11, 1);
          };
          since.setMonth(since.getMonth() - 1);
        }
        since.setDate(1)
      };

      if(since && !until){
        until = new Date();
      };
      
      const shoppings = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.accountId = :accountId', { accountId })
        .andWhere('o.created BETWEEN :since AND :until', { since, until })
        .getMany();

      let total = 0; 
      shoppings.forEach((o) => {
        total += o.total;
      });

      return {
        success: true,
        data: new MoneyVariations(since, until, total)
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async getIncome(accountId: string, since?: Date, until?: Date): Promise<SuccessDto<MoneyVariations>> {
    try {
      if(!since && until){ // no puedo asumir el since solo con esta informacion.
        return badRequest;
      };

      if(!since && !until){
        since = new Date();
        until = new Date();
        if(since.getDate() === 1){
          if(since.getMonth() === 0){
            since.setFullYear(since.getFullYear() - 1, 11, 1);
          };
          since.setMonth(since.getMonth() - 1);
        }
        since.setDate(1)
      };

      if(since && !until){
        until = new Date();
      };
      
      const sales = await this.orderItemRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.order', 'o')
        .where('i.sellerId = :accountId', { accountId })
        .andWhere('o.created BETWEEN :since AND :until', { since, until })
        .getMany();

      let total = 0; 
      sales.forEach((i) => {
        total += i.subtotal;
      });

      return {
        success: true,
        data: new MoneyVariations(since, until, total)
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }
}
