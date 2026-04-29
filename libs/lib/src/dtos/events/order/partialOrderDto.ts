import { Order } from "../../../entities/SQL/order/orderEntity";

export class PartialOrderDto{
    id: string;
    total: number;
    shippingAddress: string;
    created: Date;
    
    constructor(order: Order) {
        this.id = order.id,
        this.total = order.total,
        this.shippingAddress = order.shippingAddress,
        this.created = new Date(order.created)
    }
}