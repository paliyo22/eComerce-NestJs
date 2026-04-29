import { Product } from "../../../entities/SQL/product/productEntity";

export class ProductOrderDto {
    productId: string;
    sellerId: string;
    sellerTitle: string;
    productTitle: string;
    price: number;
    discountPercentage: number;
    amount: number;

    constructor(product: Product, accountId: string, sellerTitle: string, amount: number){
        this.productId = product.id,
        this.productTitle = product.title,
        this.sellerId = accountId,
        this.sellerTitle = sellerTitle,
        this.price = product.price,
        this.discountPercentage = product.discountPercentage,
        this.amount = amount
    };

    getSubTotal(): number {
        return ((this.amount * this.price) * (1 - this.discountPercentage / 100));
    };
}