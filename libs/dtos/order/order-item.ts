import { OrderItem } from "apps/order/src/entities/order-item";

export class OrderItemDto{
    productId: string;
    amount: number;
    total: number;
    discount: number;

    static fromEntity(item: OrderItem): OrderItemDto {
        return {
            productId: item.productId,
            amount: item.amount,
            total: item.total,
            discount: item.discountPercentage
        };
    }
}