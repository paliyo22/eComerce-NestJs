import { Cart } from "../../../entities/SQL/cart/cartEntity";
import { PartialProductDto } from "../product/partialProductDto";


export class CartOutputDto {
    id: string;
    created: Date;
    updated: Date;
    products: {
        id: string;
        title: string;
        price: number;
        amount: number;
        discount: number;
    }[]

    constructor(cart: Cart, productList: PartialProductDto[]){
        this.id = cart.id,
        this.created = new Date(cart.created),
        this.updated = new Date(cart.updated),
        this.products = productList.map((p) => {
            const aux = cart.cartProducts.find((c) => p.id === c.productId);
            if(!aux) return null;
            return {
                id: p.id,
                title: p.title,
                price: p.price,
                amount: aux.amount,
                discount: p.discountPercentage
            };
        }).filter(Boolean);
    };
}