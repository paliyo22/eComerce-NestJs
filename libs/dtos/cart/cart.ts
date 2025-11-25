import { Cart } from "apps/cart/src/entities/cart";
import { CartProductDto } from "./cart-product";

export class CartDto {
    id: string;
    created: Date;
    updated: Date;
    products: CartProductDto[];

    static fromEntity(cart: Cart): CartDto {
        return {
            id: cart.id!,
            created: cart.created,
            updated: cart.updated,
            products: cart.cartProducts.map((p) => CartProductDto.fromEntity(p))
        };
    }
}