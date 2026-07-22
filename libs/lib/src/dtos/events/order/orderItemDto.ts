import { OrderItem } from '../../../entities/SQL/order/orderItemEntity';

export class OrderItemDto{
    productId: string;
    seller: string;
    product: string;
    price: number;
    amount: number;
    discount: number;
    subtotal: number;

    constructor(item: OrderItem){
        this.productId = item.productId,
        this.seller = item.sellerTitle,
        this.product = item.productTitle,
        this.price = Number(item.price),
        this.amount = Number(item.amount),
        this.discount = Number(item.discountPercentage),
        this.subtotal = Number(item.subtotal)
    }
}