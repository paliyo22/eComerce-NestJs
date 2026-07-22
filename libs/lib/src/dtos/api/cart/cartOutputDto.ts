import { Cart } from "../../../entities/SQL/cart/cartEntity";
import { PartialProductDto } from "../product/partialProductDto";


export class CartOutputDto {
    id: string;
    created: Date;
    updated: Date;
    products: {
        cartProductId: string;
        productId: string;
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
                cartProductId: aux.id, 
                productId: p.id,
                title: p.title,
                price: Number(p.price),
                amount: Number(aux.amount),
                discount: Number(p.discountPercentage)
            };
        }).filter(Boolean);
    };
}