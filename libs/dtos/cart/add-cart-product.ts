import { PartialProductDto } from "../product";

export class AddProductToCartDto {
    cartId?: string;
    productId: string;
    title: string;
    price: number;
    amount: number;

    static fromEntity(product: PartialProductDto, amount: number, cartId?: string): AddProductToCartDto {
        return {
            cartId: cartId,
            productId: product.id,
            title: product.title,
            price: product.price,
            amount: amount
        };
    }
}