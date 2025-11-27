import { PrimaryBinaryUuidColumn } from "libs/shared";
import { Check, Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Cart } from "./cart";

@Check('discount_percentage BETWEEN 0 AND 100')
@Entity('cart_x_product')
export class CartProduct {
    @PrimaryBinaryUuidColumn({ name: 'cart_id' })
    cartId: string;

    @PrimaryBinaryUuidColumn({ name: 'product_id' })
    productId: string;

    @Column({ type: 'varchar', length: 250 })
    title: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'smallint', unsigned: true })
    amount: number;

    @Column({ type: 'int', default: 0, name: 'discount_percentage' })
    discountPercentage: number;

    @ManyToOne(() => Cart, (cart) => cart.cartProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;
}