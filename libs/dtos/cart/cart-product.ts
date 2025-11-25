import { CartProduct } from "apps/cart/src/entities/cart-product";

export class CartProductDto {
    productId: string;
    title: string;
    price: number;
    amount: number;

    static fromEntity(cart: CartProduct): CartProductDto {
        return {
            productId: cart.productId,
            title: cart.title,
            price: cart.price,
            amount: cart.amount
        };
    }
}