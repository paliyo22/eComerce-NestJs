import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DraftOrderOutputDto, OrderOutputDto } from './order-output-dto';
import { firstValueFrom } from 'rxjs';
import { SuccessDto } from 'libs/shared/respuesta';
import { OrderDto } from 'libs/dtos/order/order';
import { AccountDto, PartialAccountDto } from 'libs/dtos/acount';
import { DraftOrder } from 'apps/order/src/entities/draft-order';
import { CartService } from '../cart/cart.service';
import { CartDto } from 'libs/dtos/cart/cart';
import { CartProductDto } from 'libs/dtos/cart/cart-product';

@Injectable()
export class OrderService {
    constructor (
        @Inject('ORDER_SERVICE') 
        private readonly orderClient: ClientProxy,

        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,

        private readonly cartService: CartService,

        @Inject('CART_SERVICE') 
        private readonly cartClient: ClientProxy
    ) {};

    async createDraftOrder(userId: string, cartId?: string, productId?: string): Promise<DraftOrderOutputDto> {
        try {
            if(!cartId && !productId) {
                throw new HttpException('Error en la peticion', 400);
            }
            if(cartId && productId) {
                throw new HttpException('Error en la peticion', 400);
            }

            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<DraftOrder>>(
                    {cmd: 'create_draft_order'},
                    { userId, cartId, productId }
                )
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            let cart: CartDto | undefined = undefined; 
            let cartItem: SuccessDto<CartProductDto>| undefined = undefined; 
            if(cartId){
                cart = await this.cartService.getCart(userId);
            }else{
                cartItem = await firstValueFrom(
                    this.cartClient.send<SuccessDto<CartProductDto>>(
                        {cmd: 'get_cart_product'},
                        { userId, productId }
                    )
                ); 
                if(!cartItem.success) {
                    throw new HttpException(result.message!, result.code!);
                };
            }
            
            return DraftOrderOutputDto.fromEntity(result.data!, cart, cartItem?.data)
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }
    
    async getOrder(userId: string, orderId: string): Promise<OrderOutputDto> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<OrderDto>>(
                    {cmd: 'get_order'},
                    { userId, orderId }
                )
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const buyer = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId: result.data?.userId }
                )
            )
            if(!buyer.success) {
                throw new HttpException(buyer.message!, buyer.code!);
            };

            const seller = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId: result.data?.sellerId }
                )
            )
            if(!seller.success) {
                throw new HttpException(seller.message!, seller.code!);
            };

            return OrderOutputDto.fromEntity(result.data!, buyer.data!.username, seller.data!.username)
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }
    
    async getOrderList(userId: string, isShopping: boolean): Promise<OrderOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.orderClient.send<SuccessDto<OrderDto[]>>(
                    {cmd: 'get_sells_list'},
                    { userId, isShopping }
                )
            ); 
            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const userList = result.data!.map((o) => o.userId);
            const sellerList = result.data!.map((o) => o.sellerId);

            const buyer = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    {cmd: 'get_account_list_info'},
                    { accounts: userList }
                )
            )
            if(!buyer.success) {
                throw new HttpException(buyer.message!, buyer.code!);
            };

            const seller = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    {cmd: 'get_account_list_info'},
                    { accounts: sellerList }
                )
            )
            if(!seller.success) {
                throw new HttpException(seller.message!, seller.code!);
            };

            const buyerMap = new Map(
                buyer.data!.map(acc => [acc.id, acc.username])
            );

            const sellerMap = new Map(
                seller.data!.map(acc => [acc.id, acc.username])
            );

            return result.data!.map(order =>
                OrderOutputDto.fromEntity(
                    order,
                    buyerMap.get(order.userId)!,
                    sellerMap.get(order.sellerId)!
                )
            );
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

}
