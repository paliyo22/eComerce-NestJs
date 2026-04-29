import { OrderItem } from "../../../entities/SQL/order/orderItemEntity";

export class SaleDto { 
    productId: string;
    buyerEmail: string;
    product: string;
    price: number;
    amount: number;
    discount: number;
    subtotal: number;

    constructor(item: OrderItem){
        this.productId = item.productId,
        this.buyerEmail = item.order.contactEmail,
        this.product = item.productTitle,
        this.price = item.price,
        this.amount = item.amount,
        this.discount = item.discountPercentage,
        this.subtotal = item.subtotal
    }
}