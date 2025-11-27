import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { DraftOrderOutputDto, OrderOutputDto } from './order-output-dto';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {};

    @Get()
    @UseGuards(JwtAuthGuard)
    async getOrders(
        @Req() req
    ): Promise<OrderOutputDto[]>{
        return this.orderService.getOrderList(req.user.userId, true);
    }

    @Get('/sells')
    @UseGuards(JwtAuthGuard)
    async getSellsOrders(
        @Req() req
    ): Promise<OrderOutputDto[]>{
        return this.orderService.getOrderList(req.user.userId, false);
    }

    @Post('/draft')
    @UseGuards(JwtAuthGuard)
    async createDraftOrder(
        @Req() req,
        @Body('cartId') cartId?: string,
        @Body('productId') productId?: string
    ): Promise<DraftOrderOutputDto>{
        return this.orderService.createDraftOrder(req.user.userId, cartId, productId);
    }

    @Get('/:orderId')
    @UseGuards(JwtAuthGuard)
    async getOrder(
        @Req() req,
        @Param('orderId') orderId: string
    ): Promise<OrderOutputDto>{
        return this.orderService.getOrder(req.user.userId, orderId);
    }

}
