import { Order } from "../../../entities/SQL/order/orderEntity";
import { OrderItemDto } from "./orderItemDto";
import { PartialOrderDto } from "./partialOrderDto";


export class OrderDto extends PartialOrderDto{
    items: OrderItemDto[];

    constructor(order: Order){
        super(order);
        this.items = order.items.map((i) => new OrderItemDto(i))
    }
}

