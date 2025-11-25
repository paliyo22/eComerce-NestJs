import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CartDto } from 'libs/dtos/cart/cart';
import { SuccessDto } from 'libs/shared/respuesta';
import { Cart } from './entities/cart';
import { Repository } from 'typeorm';
import { AddProductToCartDto } from 'libs/dtos/cart/add-cart-product';
import { CartProduct } from './entities/cart-product';
import { CartProductDto } from 'libs/dtos/cart/cart-product';

@Injectable()
export class CartService {

  constructor(
      @InjectRepository(Cart)
      private readonly cartRepo: Repository<Cart>,
      @InjectRepository(CartProduct)
      private readonly cartProductRepo: Repository<CartProduct>
  ){}

  private async getCartId(accountId: string): Promise<string>{
    const cart = await this.cartRepo
      .createQueryBuilder('c')
      .where('c.accountId = :accountId', { accountId })
      .getOne();

    if(!cart){
      throw new Error('CART_NOT_FOUND');
    }
    
    return cart.id
  }

  async getCart(accountId: string): Promise<SuccessDto<CartDto>> {
    try {
      const id = await this.getCartId(accountId);

      const cart = await this.cartRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.cartProducts', 'cp')
        .where('c.id = :id', { id })
        .getOne();

      return {
        success: true,
        data: CartDto.fromEntity(cart!)
      };
     
    } catch (err) {
      if(err.message === 'CART_NOT_FOUND'){
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al conectar con la base de datos del carrito'
      }; 
    }  
  }

  async addToCart(product: AddProductToCartDto, accountId?: string): Promise<SuccessDto<CartProductDto>> {
    try {    
      let finalAmount = product.amount;
      if (!product.cartId && !accountId) {
        return { success: false, message: 'Debe enviar cartId o accountId', code: 400 };
      }
 
      if(accountId){
        product.cartId = await this.getCartId(accountId);
      }
      const cartProduct = await this.cartProductRepo
        .createQueryBuilder('cp')
        .where('cp.cartId = :cartId', { cartId: product.cartId })
        .andWhere('cp.productId = :productId', { productId: product.productId })
        .getOne();

      if (cartProduct) {
        cartProduct.amount += product.amount;
        finalAmount = cartProduct.amount;
        await this.cartProductRepo.save(cartProduct);
      } else {
        await this.cartProductRepo.insert({
          cartId: product.cartId,
          productId: product.productId,
          title: product.title,
          price: product.price,
          amount: product.amount
        });
      }

      return {
        success: true,
        data: {
          productId: product.productId,
          title: product.title,
          price: product.price,
          amount: finalAmount
        } 
      };

    } catch (err) {
      if(err.message === 'CART_NOT_FOUND'){
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al agregar producto al carrito',
      };
    }
  }

  async deleteFromCart(productId: string, accountId: string): Promise<SuccessDto<void>> {
    try {
      const cartId = await this.getCartId(accountId);

      const result = await this.cartProductRepo.delete({ cartId, productId });

      if (result.affected === 0) {
        return { success: false, message: 'Producto no encontrado en el carrito', code: 404 };
      }

      return { success: true, message: 'Producto eliminado del carrito' };
    } catch (err) {
      if (err.message === 'CART_NOT_FOUND') {
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al eliminar producto del carrito',
      };
    }
  }

  async deleteCart(accountId: string, cartId?: string): Promise<SuccessDto<void>> {
    try {
      if(!cartId){
        cartId = await this.getCartId(accountId);
      }
      const existing = await this.cartRepo.findOne({
        where: { id: cartId, accountId }
      });

      if (!existing) {
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }

      await this.cartRepo.delete({ id: cartId });

      return { success: true, message: 'Carrito eliminado' };
    } catch (err) {
      if (err.message === 'CART_NOT_FOUND') {
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al eliminar el carrito'
      };
    }
  }

  async setAmount(productId: string, amount: number, accountId?: string, cartId?: string): Promise<SuccessDto<void>> {
    try {
      if (!cartId && !accountId) {
        return { success: false, message: 'Debe enviar cartId o accountId', code: 400 };
      }

      if(!cartId){
        cartId = await this.getCartId(accountId!);
      }

      const cartProduct = await this.cartProductRepo.findOne({
        where: { cartId, productId }
      });

      if (!cartProduct) {
        return { success: false, message: 'Producto no encontrado en el carrito', code: 404 };
      }

      if (amount === 0) {
        await this.cartProductRepo.delete({ cartId, productId });
        return { success: true, message: 'Producto eliminado del carrito' };
      }

      cartProduct.amount = amount;
      await this.cartProductRepo.save(cartProduct);

      return { success: true , message: 'Cantidad actualizada'};
    } catch (err) {
      if (err.message === 'CART_NOT_FOUND') {
        return { success: false, message: 'Carrito no encontrado', code: 404 };
      }
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al actualizar cantidad del producto'
      };
    }
  }
}
