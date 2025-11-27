import { DraftOrder } from "apps/order/src/entities/draft-order";
import { CartDto } from "libs/dtos/cart/cart";
import { CartProductDto } from "libs/dtos/cart/cart-product";
import { OrderDto } from "libs/dtos/order/order";
import { OrderItemDto } from "libs/dtos/order/order-item";

export class OrderOutputDto{
    id: string;
    name: string;
    sellerName: string; 
    total: number;
    date: Date;
    items?: OrderItemOutputDto[];

    static fromEntity(order: OrderDto, user: string, seller: string): OrderOutputDto {
        return {
            id: order.id,
            name: user,
            sellerName: seller,
            total: order.total,
            date: order.date,
            items: order.items?.map((i) => OrderItemOutputDto.fromEntity(i)) || undefined
        };
    }
}

export class OrderItemOutputDto{
    productId: string;
    title: string;
    amount: number;
    total: number;
    discount: number;

    static fromEntity(item: OrderItemDto): OrderItemOutputDto {
        return {
            productId: item.productId,
            title: item.title,
            amount: item.amount,
            total: item.total,
            discount: item.discount
        };
    }
}

export class DraftOrderOutputDto{
    id: number;
    cart?: CartProductDto[];
    product?: CartProductDto;
    total: number;

    static fromEntity(item: DraftOrder, cart?: CartDto, cartItem?: CartProductDto): DraftOrderOutputDto {
        if(cart){    
            let acum: number = 0;
            cart.products.forEach((p) => {
                acum += (p.price * p.amount) * (1 - (p.discount / 100));
            });
            return {
                id: item.id,
                cart: cart.products,
                total: acum
            }
        }else{
            return {
                id: item.id,
                product: cartItem,
                total: ((cartItem!.price*cartItem!.amount)*(cartItem!.discount/100))
            }
        }
    }
}