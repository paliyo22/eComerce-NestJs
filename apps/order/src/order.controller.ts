import { Controller, Get } from '@nestjs/common';
import { OrderService } from './order.service';
import { SuccessDto } from 'libs/shared/respuesta';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderDto } from 'libs/dtos/order/order';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern({ cmd: 'get_shopping_list' })
  async getShoppingList(@Payload() data: { accountId: string }): Promise<SuccessDto<OrderDto>> {
    return this.orderService.getShoppingList(data.accountId);
  }

  
}
