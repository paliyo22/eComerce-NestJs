import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SuccessDto, Cart, AddProductToCartDto, CartProduct, 
  CartOutputDto, PartialProductDto, ProductOrderDto, withRetry, 
  UnavailableProductsDto, errorMessage, notAvailable, badRequest, 
  notFound, unauthorized } from '@app/lib';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartProduct)
    private readonly cartProductRepo: Repository<CartProduct>,
    @Inject('PRODUCT_SERVICE') 
    private readonly productClient: ClientProxy,
    @Inject('REDIS_CLIENT')
    private redis: Redis
  ){}

  private async myCart(accountId: string): Promise<Cart> {
    let cart = await this.cartRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cartProducts', 'cp')
      .where('c.accountId = :accountId', { accountId })
      .getOne();

    if(!cart){
      cart = await this.cartRepo.save({ accountId });
      cart.cartProducts = [];
    }

    return cart;
  }

  async getCart(accountId: string, cartId?: string): Promise<SuccessDto<CartOutputDto>> {
    try {
      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as CartOutputDto 
        };
      }

      let cart: Cart;

      if(!cartId){
        cart = await this.myCart(accountId);
      }else {
        cart = await this.cartRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.cartProducts', 'cp')
        .where('c.id = :id', { id: cartId})
        .getOne();
      }

      if (!cart) return notFound;

      if(!cart.cartProducts.length){
        return {
          success: true,
          data: new CartOutputDto(cart, [])
        };
      };

      const productIds = cart.cartProducts.map(s => {
        return s.productId;
      });
      
      const products = await firstValueFrom(
        this.productClient.send<SuccessDto<PartialProductDto[]>>(
          { cmd: 'get_product_from_list' },
          { productIds }
        )
      );
      
      if(!products.success){
        return {
          success: products.success,
          code: products.code,
          message: products.message
        }
      }

      const data = new CartOutputDto(cart, products.data!);
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30);
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(err);
    }  
  }

  async addToCart(accountId: string, newProduct: AddProductToCartDto, cartId?: string): Promise<SuccessDto<void>> {
    try {    
      const cacheKey = `cart:${accountId}`;
      let cart: Cart;
      if(!cartId){
        cart = await this.myCart(accountId);
      }else{
        cart = await this.cartRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.cartProducts', 'cp')
        .where('c.id = :id', { id: cartId})
        .andWhere('c.accountId = :accountId', { accountId })
        .getOne();
      };

      if(!cart)
         return unauthorized;

      const product = await firstValueFrom(
        this.productClient.send<SuccessDto<void>>(
          { cmd: 'is_active' },
          { productId: newProduct.productId }
        )
      );

      if(!product.success){
        return notAvailable;
      }

      const cartProduct = cart.cartProducts.find((i) => i.productId === newProduct.productId);

      if (cartProduct) {
        cartProduct.amount += newProduct.amount;
        await this.cartProductRepo.save(cartProduct);
      } else {
        await this.cartProductRepo.save({
          cartId: cart.id,
          productId: newProduct.productId,
          amount: newProduct.amount
        });
      }

      await this.redis.del(cacheKey);
      return {
        success: true
      };

    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async deleteFromCart(accountId: string, cartProductId: string): Promise<SuccessDto<void>> {
    try { 
      const cacheKey = `cart:${accountId}`;
      /*
      const result = await this.cartProductRepo
        .createQueryBuilder('cp')
        .delete()
        .where('cp.id = :id', { id: cartProductId })
        .andWhere(`cp.cart_id IN (SELECT id FROM cart WHERE account_id = :accountId)`, { accountId })
        .execute();
      */

      const cartSubQuery = this.cartRepo
        .createQueryBuilder('c')
        .select('c.id')
        .where('c.accountId = :accountId', { accountId });

      const result = await this.cartProductRepo
        .createQueryBuilder('cp')
        .delete()
        .where('cp.id = :id', { id: cartProductId })
        .andWhere(`cp.cartId IN (${cartSubQuery.getQuery()})`)
        .setParameters(cartSubQuery.getParameters())
        .execute();

      if (result.affected === 0) {
        return notFound;
      }

      await this.redis.del(cacheKey);
      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async deleteCart(accountId: string): Promise<SuccessDto<void>> {
    try {
      const cacheKey = `cart:${accountId}`;
      const aux = await this.cartRepo
      .createQueryBuilder('c')
      .delete()
      .where('c.accountId = :accountId', { accountId })
      .execute();

      if(!aux.affected){
        return badRequest;
      };

      await this.redis.del(cacheKey);
      return { 
        success: true 
      };
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async setAmount(accountId: string, cartProductId: string, amount: number): Promise<SuccessDto<void>> {
    try { 
      const cacheKey = `cart:${accountId}`;
 
      if (amount === 0) {
        return this.deleteFromCart(accountId, cartProductId);
      }
      /*
      const result = await this.cartProductRepo
        .createQueryBuilder('cp')
        .update()
        .set({ amount })
        .where('cp.id = :id', { id: cartProductId })
        .andWhere(`cp.cart_id IN (SELECT id FROM cart WHERE account_id = :accountId)`, { accountId })
        .execute();
      */
      const cartSubQuery = this.cartRepo
          .createQueryBuilder('c')
          .select('c.id')
          .where('c.accountId = :accountId', { accountId });

      const result = await this.cartProductRepo
          .createQueryBuilder('cp')
          .update()
          .set({ amount })
          .where('cp.id = :id', { id: cartProductId })
          .andWhere(`cp.cartId IN (${cartSubQuery.getQuery()})`)
          .setParameters(cartSubQuery.getParameters())
          .execute();

      if(!result.affected)
        return notFound;

      await this.redis.del(cacheKey);
      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async makeReserve(accountId: string, cartId?: string, cartProductId?: string): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
    try {
      const products: {productId: string, amount: number}[] = [];
      if(cartProductId){
        const cartProduct = await this.cartProductRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.cart', 'c')
          .where('p.id = :id', {id: cartProductId})
          .getOne();

        if(!cartProduct || cartProduct.cart.accountId !== accountId){
          return badRequest;
        };

        products.push({productId: cartProduct.productId, amount: cartProduct.amount});
      } else {
        const cart = await this.cartRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.cartProducts', 'cp')
          .where('c.id = :id', { id: cartId })
          .getOne();

        if(!cart || cart.accountId !== accountId || !cart.cartProducts.length){
          return badRequest;
        };

        cart.cartProducts.forEach((p) => {
          products.push({productId: p.productId, amount: p.amount});
        });
      };

      const result = await firstValueFrom(
        this.productClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
          { cmd: 'reserve' },
          { products }
        ).pipe(withRetry())
      );

      if(!result.success){
        return {
          success: false,
          code: result.code,
          message: result.message 
        };
      };
      
      return {
        success: true,
        data: result.data
      }
    } catch (err: any) {
      return errorMessage(err);
    }
  }

  async deleteProductsFromCarts(productIds: string[]): Promise<void> {
    try {
      await this.cartProductRepo
        .createQueryBuilder('c')
        .delete()
        .where('c.productId IN (:...ids)', { ids: productIds })
        .execute();    
    } catch (err: any) {
      console.error('Fallo el metodo "deleteProductsFromCarts" del MS: Cart');
    }
  }
}