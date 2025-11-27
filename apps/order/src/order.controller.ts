import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { SuccessDto } from 'libs/shared/respuesta';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderDto } from 'libs/dtos/order/order';
import { DraftOrderDto } from 'libs/dtos/order/draft-order';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern({ cmd: 'create_draft_order' })
  async createDraftOrder(@Payload() data: { userId: string, total: number, cartId?: string, productId?: string }): Promise<SuccessDto<DraftOrderDto>> {
    return this.orderService.createDraftOrder(data.userId, data.total, data.cartId, data.productId);
  }

  @MessagePattern({ cmd: 'get_order' })
  async getOrder(@Payload() data: { userId: string; orderId: string }): Promise<SuccessDto<OrderDto>> {
    return this.orderService.getOrder(data.userId, data.orderId);
  }

  @MessagePattern({ cmd: 'get_sells_list' })
  async getOrderList(@Payload() data: { userId: string; isShopping: boolean }): Promise<SuccessDto<OrderDto[]>> {
    return this.orderService.getOrderList(data.userId, data.isShopping);
  }
  
  @MessagePattern({ cmd: 'get_draft_order' })
  async getDraftOrder(@Payload() data: { userId: string; draftId: number }): Promise<SuccessDto<DraftOrderDto>> {
    return this.orderService.getDraftOrder(data.userId, data.draftId);
  }
}
