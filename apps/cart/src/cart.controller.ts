import { Controller } from '@nestjs/common';
import { CartService } from './cart.service';
import { SuccessDto } from 'libs/shared/respuesta';
import { CartDto } from 'libs/dtos/cart/cart';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AddProductToCartDto } from 'libs/dtos/cart/add-cart-product';
import { CartProductDto } from 'libs/dtos/cart/cart-product';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @MessagePattern({ cmd: 'get_cart' })
  async getCart(@Payload() data: { accountId: string }): Promise<SuccessDto<CartDto>> {
    return this.cartService.getCart(data.accountId);
  }

  @MessagePattern({ cmd: 'add_product_to_cart' })
  async addToCart(@Payload() data: { userId: string, productId: string, newProduct: AddProductToCartDto }): Promise<SuccessDto<void>> {
    return this.cartService.addToCart(data.userId, data.productId, data.newProduct);
  }

  @MessagePattern({ cmd: 'delete_product_of_cart' })
  async deleteFromCart(@Payload() data: { productId: string, accountId: string }): Promise<SuccessDto<void>> {
    return this.cartService.deleteFromCart(data.productId, data.accountId);
  }

  @MessagePattern({ cmd: 'delete_cart' })
  async deleteCart(@Payload() data: { userId: string }): Promise<SuccessDto<void>> {
    return this.cartService.deleteCart(data.userId);
  }

  @MessagePattern({ cmd: 'set_amount' })
  async setAmount(@Payload() data: { userId: string, productId: string, amount: number, cartId?: string }): Promise<SuccessDto<void>> {
    return this.cartService.setAmount(data.userId, data.productId, data.amount, data.cartId);
  }

  @MessagePattern({ cmd: 'get_cart_product' })
  async getCartProduct(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<CartProductDto>> {
    return this.cartService.getCartProduct(data.userId, data.productId);
  }
}