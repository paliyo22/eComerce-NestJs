import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SuccessDto, Cart, AddProductToCartDto, CartProduct, 
  CartOutputDto, PartialProductDto, ProductOrderDto, UnavailableProductsDto, 
  errorMessage, notAvailable, badRequest, notFound, OrderItem, uuidTransformer} from '@app/lib';
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
  
  private readonly logger = new Logger(CartService.name);

  private async myCart(accountId: string): Promise<Cart> {
    let cart = await this.cartRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cartProducts', 'cp')
      .where('c.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
      .getOne();

    if(!cart){
      cart = this.cartRepo.create({ accountId })
      await this.cartRepo.save(cart, { reload: false });
      cart.cartProducts = [];
    }

    return cart;
  }

  async getCart(accountId: string): Promise<SuccessDto<CartOutputDto>> {
    try {
      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      if (cached) {
        return { 
          success: true, 
          data: JSON.parse(cached) as CartOutputDto 
        };
      }

      const cart = await this.myCart(accountId);

      if (!cart) return errorMessage(); //esto no deberia pasar jamas porque solo puede fallar si la query falla y eso lo mandaria al catch.

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
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 30).catch(() => {});
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }  
  }

  async addToCart(accountId: string, newProduct: AddProductToCartDto): Promise<SuccessDto<void>> {
    try {    
      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      
      let cart: Cart | CartOutputDto;
      if (cached) {
        cart = JSON.parse(cached) as CartOutputDto 
      }else{
        cart = await this.myCart(accountId);
        if(!cart) return errorMessage();
      }    

      const product = await firstValueFrom(
        this.productClient.send<SuccessDto<void>>(
          { cmd: 'is_active' },
          { productId: newProduct.productId }
        )
      );

      if(!product.success){
        return notAvailable;
      }

      let cartProduct: CartProduct;
      if(cart instanceof Cart){
        cartProduct = cart.cartProducts.find((i) => i.productId === newProduct.productId);
      }else{
        const aux = cart.products.find((i) => i.productId === newProduct.productId);
        if(aux){
          cartProduct= {
            id: aux.cartProductId,
            cartId: cart.id,
            productId: newProduct.productId,
            amount: aux.amount
          } as CartProduct;
        }
      }
      
      if (cartProduct) {
        cartProduct.amount += newProduct.amount;
        await this.cartProductRepo.save(cartProduct);
      } else {
        const result = this.cartProductRepo.create({
          cartId: cart.id,
          productId: newProduct.productId,
          amount: newProduct.amount
        })
        await this.cartProductRepo.save(result);
      }

      await this.redis.del(cacheKey).catch(() => {});
      return {
        success: true
      };

    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }
  }

  async deleteFromCart(accountId: string, cartProductId: string): Promise<SuccessDto<void>> {
    try { 
      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      
      let cartId: string;
      if (cached) {
        cartId = (JSON.parse(cached) as CartOutputDto).id; 
      }else{
        cartId = (await this.myCart(accountId)).id;
      }

      const result = await this.cartProductRepo
        .createQueryBuilder()
        .delete()
        .where('id = :id', { id: uuidTransformer.to(cartProductId) })
        .andWhere('cartId = :cartId', { cartId: uuidTransformer.to(cartId) })
        .execute();

      if (result.affected === 0) {
        return notFound;
      }

      await this.redis.del(cacheKey).catch(() => {});
      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }
  }

  async deleteCart(accountId: string): Promise<SuccessDto<void>> {
    try {
      const cacheKey = `cart:${accountId}`;
      const aux = await this.cartRepo
      .createQueryBuilder()
      .delete()
      .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
      .execute();

      if(!aux.affected){
        return badRequest;
      };

      await this.redis.del(cacheKey).catch(() => {});
      return { 
        success: true 
      };
    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }
  }

  async setAmount(accountId: string, cartProductId: string, amount: number): Promise<SuccessDto<void>> {
    try {  
      if (amount === 0) {
        return this.deleteFromCart(accountId, cartProductId);
      }

      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      
      let cartId: string;
      if (cached) {
        cartId = (JSON.parse(cached) as CartOutputDto).id; 
      }else{
        cartId = (await this.myCart(accountId)).id;
      }

      const result = await this.cartProductRepo
        .createQueryBuilder()
        .update()
        .set({ amount })
        .where('id = :id', { id: uuidTransformer.to(cartProductId) })
        .andWhere(`cartId = :cartId`, { cartId: uuidTransformer.to(cartId) })
        .execute();

      if(!result.affected)
        return notFound;

      await this.redis.del(cacheKey);
      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }
  }

  async makeReserve(accountId: string, cartId?: string, cartProductId?: string): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
    try {
      const products: {productId: string, amount: number}[] = [];
      if(cartProductId){
        const cartProduct = await this.cartProductRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.cart', 'c')
          .where('p.id = :id', {id: uuidTransformer.to(cartProductId) })
          .getOne();

        if(!cartProduct || cartProduct.cart.accountId !== accountId){
          return badRequest;
        };

        products.push({productId: cartProduct.productId, amount: cartProduct.amount});
      } else {
        const cart = await this.cartRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.cartProducts', 'cp')
          .where('c.id = :id', { id: uuidTransformer.to(cartId) })
          .getOne();

        if(!cart || cart.accountId !== accountId || !cart.cartProducts.length){
          return badRequest;
        };

        cart.cartProducts.forEach((p) => {
          products.push({productId: p.productId, amount: p.amount});
        });
      };

      return firstValueFrom(
        this.productClient.send<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>(
          { cmd: 'reserve' },
          { products }
        )
      );

    } catch (err: any) {
      return errorMessage(CartService.name, err);
    }
  }

  async deleteProductsFromCarts(productIds: string[]): Promise<void> {
    try {
      const ids = productIds.map((p) => uuidTransformer.to(p));
      await this.cartProductRepo
        .createQueryBuilder()
        .delete()
        .where('productId IN (:...ids)', { ids })
        .execute();    
    } catch (err: any) {
      this.logger.warn('The method "deleteProductsFromCarts" has failed.');
    }
  }

  async deleteProductsFromCart(accountId: string, items: OrderItem[]): Promise<void> {
    try {
      console.log(`ingeso de deleteFromCart: \naccountId: ${accountId} \nitems: `, items);
      const cacheKey = `cart:${accountId}`;
      const cached = await this.redis.get(cacheKey).catch(() => {});
      
      let cartId: string;
      if (cached) {
        cartId = (JSON.parse(cached) as CartOutputDto).id; 
        console.log('from cache cartId: ', cartId);
      }else{
        cartId = (await this.myCart(accountId)).id;
        console.log('from db cartId: ', cartId);
      }

      const products = items.map((i) => uuidTransformer.to(i.productId));

      console.log('productsIds: ', products);
      const aux = await this.cartProductRepo
        .createQueryBuilder()
        .delete()
        .where('productId IN (:...productIds)', { productIds: products })
        .andWhere(`cartId = :cartId`, { cartId: uuidTransformer.to(cartId) })
        .execute();
      
      console.log('aux: ', aux);
    } catch (err: any) {
      this.logger.log('The function "deleteProductsFromCarts" failed', err);
    }
  }
}