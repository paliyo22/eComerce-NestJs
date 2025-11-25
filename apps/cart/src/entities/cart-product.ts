import { uuidTransformer } from "libs/shared";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Cart } from "./cart";

@Entity('cart_x_product')
export class CartProduct {
    @PrimaryColumn({
    name: 'cart_id', type: 'binary',
    length: 16, transformer: uuidTransformer
    })
    cartId: string;

    @PrimaryColumn({
    name: 'product_id', type: 'binary',
    length: 16, transformer: uuidTransformer
    })
    productId: string;

    @Column({ type: 'varchar', length: 250 })
    title: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'smallint', unsigned: true })
    amount: number;

    @ManyToOne(() => Cart, (cart) => cart.cartProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;
}