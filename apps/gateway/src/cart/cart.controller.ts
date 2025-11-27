import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CartDto } from 'libs/dtos/cart/cart';
import { AddProductToCartDto } from 'libs/dtos/cart/add-cart-product';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {};

    @Get()
    @UseGuards(JwtAuthGuard)
    async getCart(@Req() req): Promise<CartDto>{
        return this.cartService.getCart(req.user.userId);
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    async deleteCart(@Req() req): Promise<string>{
        return this.cartService.deleteCart(req.user.userId);
    }

    @Post('/:productId')
    @UseGuards(JwtAuthGuard)
    async addProductToCart(
        @Req() req, 
        @Param('productId') productId: string,
        @Body('newProduct') newProduct: AddProductToCartDto
    ): Promise<string>{
        return this.cartService.addToCart(req.user.userId, productId, newProduct);
    }

    @Patch('/:productId')
    @UseGuards(JwtAuthGuard)
    async setAmount(
        @Req() req, 
        @Param('productId') productId: string,
        @Query('amount') amount: number,
        @Query('cartId') cartId?: string
    ): Promise<string>{
        return this.cartService.setAmount(req.user.userId, productId, amount, cartId);
    }

    @Delete('/:productId')
    @UseGuards(JwtAuthGuard)
    async deleteProductCart(
        @Req() req,
        @Param('productId') productId: string,
    ): Promise<string>{
        return this.cartService.deleteProductCart(req.user.userId, productId);
    }
}
