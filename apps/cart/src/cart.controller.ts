import { Controller } from '@nestjs/common';
import { CartService } from './cart.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SuccessDto, AddProductToCartDto, CartOutputDto, ProductOrderDto, UnavailableProductsDto } from '@app/lib';


@Controller()
export class CartController {
  constructor(
    private readonly cartService: CartService
  ) {}

  @MessagePattern({ cmd: 'get_cart' })
  async getCart(@Payload() data: { accountId: string, cartId?: string }): Promise<SuccessDto<CartOutputDto>> {
    return await this.cartService.getCart(data.accountId, data.cartId);
  }

  @MessagePattern({ cmd: 'add_product_to_cart' })
  async addToCart(@Payload() data: { accountId: string, newProduct: AddProductToCartDto, cartId?: string }): Promise<SuccessDto<void>> {
    return this.cartService.addToCart(data.accountId, data.newProduct, data.cartId);
  }

  @MessagePattern({ cmd: 'delete_product_from_cart' })
  async deleteFromCart(@Payload() data: { accountId: string, cartProductId: string }): Promise<SuccessDto<void>> {
    return this.cartService.deleteFromCart(data.accountId, data.cartProductId);
  }

  @MessagePattern({ cmd: 'delete_cart' })
  async deleteCart(@Payload() data: { accountId: string }): Promise<SuccessDto<void>> {
    return this.cartService.deleteCart(data.accountId);
  }

  @MessagePattern({ cmd: 'set_amount' })
  async setAmount(@Payload() data: { accountId: string, cartProductId: string, amount: number }): Promise<SuccessDto<void>> {
    return this.cartService.setAmount(data.accountId, data.cartProductId, data.amount);
  }

  // ----------------------------- Event Functions ------------------------------------
  // se invoca en: Order/createDraftOrder
  @MessagePattern({ cmd: 'reserve'})
  async reserve(@Payload() data: { accountId: string, cartId?: string, cartProductId?: string}): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>>{
    return this.cartService.makeReserve(data.accountId, data.cartId, data.cartProductId);
  }

  // se invoca en: Product/deleteFromCarts
  @EventPattern('delete.products.from.carts')
  async deleteProductsFromCarts(@Payload() data: { productIds: string[]}): Promise<void>{
    this.cartService.deleteProductsFromCarts(data.productIds);
  }
}