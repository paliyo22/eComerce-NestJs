import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, BeforeInsert } from "typeorm";
import { v4 as uuid } from 'uuid';
import { Cart } from "./cartEntity";

@Check('amount > 0')
@Entity('cart_x_product')
@Index('idx_cart', ['cartId'])
export class CartProduct {
    constructor(){};
    
    @PrimaryBinaryUuidColumn()
    id: string;
    @BeforeInsert()
    generateId() {
        if (!this.id) {
        this.id = uuid();
        }
    }

    @BinaryUuidColumn({ name: 'cart_id' })
    cartId: string;

    @BinaryUuidColumn({ name: 'product_id' })
    productId: string;

    @Column({ type: 'smallint', unsigned: true })
    amount: number;

    @ManyToOne(() => Cart, (cart) => cart.cartProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;
}