import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, 
    ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddProductToCartDto, CartOutputDto, ERole, getRoleGroup } from '@app/lib';
import { User } from '../decorators/authGuard.decorator';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import type { JwtPayload } from '../interfaces/JwtPayload';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
    constructor(
        private readonly cartService: CartService
    ) {};

    @Get()
    async getCart(
        @User() data: JwtPayload,
        @Query('cartId', new ParseUUIDPipe({ optional: true })) cartId?: string
    ): Promise<CartOutputDto>{
        if(getRoleGroup(data.role) === ERole.Admin)
            throw new ForbiddenException(`Admin accounts can't make purchases`);
        
        return this.cartService.getCart(data.accountId, cartId);
    }
    
    @Post()
    @HttpCode(201)
    async addProductToCart(
        @User() data: JwtPayload, 
        @Body() newProduct: AddProductToCartDto,
        @Query('cartId', new ParseUUIDPipe({ optional: true })) cartId?: string
    ): Promise<void>{
        if(getRoleGroup(data.role) === ERole.Admin)
            throw new ForbiddenException(`Admin accounts can't make purchases`);

        await this.cartService.addToCart(data.accountId, newProduct, cartId);
    }
    
    @Delete()
    @HttpCode(204)
    async deleteCart(
        @User('accountId') accountId: string
    ): Promise<void>{
        await this.cartService.deleteCart(accountId);
    }

    @Patch('/:cartProductId')
    @HttpCode(204)
    async setAmount(
        @User('accountId') accountId: string,
        @Query('amount', ParseIntPipe) amount: number,
        @Param('cartProductId', ParseUUIDPipe) cartProductId: string
    ): Promise<void>{
        await this.cartService.setAmount(accountId, cartProductId, amount);
    }

    @Delete('/:cartProductId')
    @HttpCode(204)
    async deleteProductCart(
        @User('accountId') accountId: string,
        @Param('cartProductId', ParseUUIDPipe) cartProductId: string,
    ): Promise<void>{
        await this.cartService.deleteProductCart(accountId, cartProductId);
    }
}
