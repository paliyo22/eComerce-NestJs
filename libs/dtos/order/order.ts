import { PurchaseOrder } from "apps/order/src/entities/purchase-order";
import { OrderItemDto } from "./order-item";

export class OrderDto{
    id: string;
    userId: string;
    sellerId: string; 
    total: number;
    date: Date;
    items?: OrderItemDto[];

    static fromEntity(order: PurchaseOrder): OrderDto {
        return {
            id: order.id!,
            userId: order.userId,
            sellerId: order.sellerId,
            total: order.total,
            date: order.created,
            items: order.items.map((i) => OrderItemDto.fromEntity(i)) || undefined
        };
    }
}

