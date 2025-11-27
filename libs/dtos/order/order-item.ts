import { OrderItem } from "apps/order/src/entities/order-item";

export class OrderItemDto{
    productId: string;
    title: string;
    amount: number;
    discount: number;
    total: number;

    static fromEntity(item: OrderItem): OrderItemDto {
        return {
            productId: item.productId,
            title: item.title,
            amount: item.amount,
            discount: item.discountPercentage,
            total: item.total
        };
    }
}