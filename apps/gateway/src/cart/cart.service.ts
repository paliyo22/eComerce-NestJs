import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AddProductToCartDto, CartOutputDto, SuccessDto, withRetry } from '@app/lib';
import { firstValueFrom } from 'rxjs';
import { errorManager } from '../helpers/errorManager';

@Injectable()
export class CartService {
    constructor (
        @Inject('CART_SERVICE') 
        private readonly cartClient: ClientProxy
    ) {};

    async getCart(accountId: string): Promise<CartOutputDto> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<CartOutputDto>>(
                    { cmd: 'get_cart' },
                    { accountId }
                ).pipe(withRetry())
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, CartService.name);
        }
    }

    async deleteCart(accountId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'delete_cart' },
                    { accountId }
                ).pipe(withRetry())
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, CartService.name);
        }
    }

    async addToCart(accountId: string, newProduct: AddProductToCartDto): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'add_product_to_cart' },
                    { accountId, newProduct }
                ).pipe(withRetry())
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, CartService.name);
        }
    }

    async setAmount(accountId: string, cartProductId: string, amount: number ): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'set_amount' },
                    { accountId, cartProductId, amount }
                ).pipe(withRetry())
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, CartService.name);
        }
    }

    async deleteProductCart(accountId: string, cartProductId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'delete_product_from_cart' },
                    { accountId, cartProductId }
                ).pipe(withRetry())
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, CartService.name);
        }
    }
}

