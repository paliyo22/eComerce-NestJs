import { OrderDto } from "libs/dtos/order/order";
import { OrderItemDto } from "libs/dtos/order/order-item";

export class OrderOutputDto{
    id: string;
    name: string;
    sellerName: string; 
    total: number;
    date: Date;
    items?: OrderItemOutputDto[];

    static fromEntity(order: OrderDto, user: string, seller: string, products: string[]): OrderOutputDto {
        return {
            id: order.id!,
            name: user,
            sellerName: seller,
            total: order.total,
            date: order.date,
            items: order.items.map((i) => OrderItemOutputDto.fromEntity(i)) || undefined
        };
    }
}

export class OrderItemOutputDto{
    productId: string;
    title: string;
    amount: number;
    total: number;
    discount: number;

    static fromEntity(item: OrderItemDto, title: string): OrderItemOutputDto {
        return {
            productId: item.productId,
            title: title,
            amount: item.amount,
            total: item.total,
            discount: item.discountPercentage
        };
    }
}