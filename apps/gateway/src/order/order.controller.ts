import { BadRequestException, Controller, Get, ParseDatePipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { MoneyVariations, OrderDto, PartialOrderDto, SaleDto } from '@app/lib';
import { User } from '../decorators/authGuard.decorator';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService) {};

    @Get()
    async getOrder(
        @User('accountId') accountId: string,
        @Query('orderId', new ParseUUIDPipe({ optional: true})) orderId?: string,
        @Query('draftOrderId', new ParseUUIDPipe({ optional: true})) draftOrderId?: string
    ): Promise<OrderDto>{
        if((!orderId && !draftOrderId) || (orderId && draftOrderId)){
            throw new BadRequestException('You must provide one id');
        }
        return this.orderService.getOrder(accountId, orderId, draftOrderId);
    }
    
    // ------------------------- METODOS DE COMPRADORES -------------------------------
    @Get('/shoppingList')
    async getShoppingOrderList(
        @User('accountId') accountId: string
    ): Promise<PartialOrderDto[]>{
        return this.orderService.getShoppingList(accountId);
    }

    @Get('/outgo')
    async getOutgoBetween(
        @User('accountId') accountId: string,
        @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
        @Query('until', new ParseDatePipe({ optional: true })) until?: Date
    ): Promise<MoneyVariations> {
        if(!since && until){
            throw new BadRequestException('You must provide the initial date or none dates.');
        }
        return this.orderService.getOutgoBetween(accountId, since, until)
    }
    // ------------------------- METODOS DE VENDEDORES ----------------------------------
    @Get('/salesList')
    async getSalesOrderList(
        @User('accountId') accountId: string
    ): Promise<SaleDto[]>{
        return this.orderService.getSalesList(accountId);
    };

    @Get('/income')
    async getIncomeBetween(
        @User('accountId') accountId: string,
        @Query('since', new ParseDatePipe({ optional: true })) since?: Date,
        @Query('until', new ParseDatePipe({ optional: true })) until?: Date
    ): Promise<MoneyVariations> {
        if(!since && until){
            throw new BadRequestException('You must provide the initial date or none dates.');
        }
        return this.orderService.getIncomeBetween(accountId, since, until)
    }
}
