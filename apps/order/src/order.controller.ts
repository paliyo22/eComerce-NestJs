import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SuccessDto, OrderDto, DraftOrderOutputDto, CreateDraftOrderDto, 
  EStateStatus, DraftOrder, PartialOrderDto, SaleDto, UnavailableProductsDto,
  MoneyVariations } from '@app/lib';

@Controller()
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  // --------------------------- CHECKOUT --------------------------------
  @MessagePattern({ cmd: 'create_draft_order' })
  async setDraftOrder(@Payload() data: { accountId: string, dto: CreateDraftOrderDto }): Promise<SuccessDto<DraftOrderOutputDto | UnavailableProductsDto[]>> {
    return this.orderService.createDraftOrder(data.accountId, data.dto);
  }
  
  @MessagePattern({ cmd: 'get_draft_order_status' })
  async getDraftOrderStatus(@Payload() data: { draftOrderId: string }): Promise<SuccessDto<EStateStatus>> {
    return this.orderService.getDraftOrderStatus(data.draftOrderId);  
  }

  @MessagePattern({ cmd: 'get_draft_order' })
  async getDraftOrder(@Payload() data: { accountId: string, draftOrderId: string }): Promise<SuccessDto<DraftOrder>> {
    return this.orderService.getDraftOrder(data.accountId, data.draftOrderId);
  }

  @MessagePattern({ cmd: 'cancel_draft_order' })
  async cancelDraftOrder(@Payload() data: { draftOrderId: string, accountId?: string }): Promise<SuccessDto<void>> {
    return this.orderService.cancelDraftOrder(data.draftOrderId, data.accountId);
  }

  @MessagePattern({ cmd: 'create_order' })
  async setOrder(@Payload() data: { draftOrderId: string, accountId?: string }): Promise<SuccessDto<void>> {
    return this.orderService.setOrder(data.draftOrderId, data.accountId);
  }

  // -------------------------- ORDER ------------------------
  @MessagePattern({ cmd: 'get_order' })
  async getOrder(@Payload() data: { accountId: string, orderId?: string, draftOrderId?: string }): Promise<SuccessDto<OrderDto>> {
    return this.orderService.getOrder(data.accountId, data.orderId, data.draftOrderId);
  }

  @MessagePattern({ cmd: 'get_shopping_list' })
  async getShoppingList(@Payload() data: { accountId: string }): Promise<SuccessDto<PartialOrderDto[]>> {
    return this.orderService.getShoppingList(data.accountId);
  }

  @MessagePattern({ cmd: 'get_sales_list' })
  async getSalesList(@Payload() data: { accountId: string }): Promise<SuccessDto<SaleDto[]>> {
    return this.orderService.getSalesList(data.accountId);
  }

  @MessagePattern({ cmd: 'get_incomes' })
  async getIncome(@Payload() data: { accountId: string, since?: Date, until?: Date }): Promise<SuccessDto<MoneyVariations>> {
    let since: Date | undefined = undefined,
      until: Date | undefined = undefined;
    if(data.since){
      since = new Date(data.since),
      until = new Date(data.until);
    }
    return this.orderService.getIncome(data.accountId, since, until);
  }

  @MessagePattern({ cmd: 'get_outgo' })
  async getOutgo(@Payload() data: { accountId: string, since?: Date, until?: Date }): Promise<SuccessDto<MoneyVariations>> {
    let since: Date | undefined = undefined,
      until: Date | undefined = undefined;
    if(data.since){
      since = new Date(data.since),
      until = new Date(data.until);
    }
    return this.orderService.getOutgo(data.accountId, since, until);
  }
}
