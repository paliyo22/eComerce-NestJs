import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AddProductToCartDto } from 'libs/dtos/cart/add-cart-product';
import { CartDto } from 'libs/dtos/cart/cart';
import { SuccessDto } from 'libs/shared/respuesta';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CartService {
    constructor (
        @Inject('CART_SERVICE') 
        private readonly cartClient: ClientProxy
    ) {};

    async getCart(userId: string): Promise<CartDto> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<CartDto>>(
                    { cmd: 'get_cart' },
                    { userId }
                )
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.data!;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async deleteCart(userId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'delete_cart' },
                    { userId }
                )
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.message!;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async addToCart(userId: string, productId: string, newProduct: AddProductToCartDto): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'add_product_to_cart' },
                    { userId, productId, newProduct }
                )
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.message!;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async setAmount(userId: string, productId: string, amount: number, cartId?: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'set_amount' },
                    { userId, productId, amount, cartId }
                )
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.message!;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async deleteProductCart(userId: string, productId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.cartClient.send<SuccessDto<void>>(
                    { cmd: 'delete_product_of_cart' },
                    { userId, productId}
                )
            );

            if (!result.success) {
                throw new HttpException(result.message!, result.code!);
            }

            return result.message!;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }
}

