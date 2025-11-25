import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Check } from "typeorm";

@Check(`(cart_id is not null and product_id is null) or 
    (cart_id is null and product_id is not null)`)
@Entity('draft_order')
export class DraftOrder {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: number;

    @BinaryUuidColumn({ name: 'user_id' })
    userId: string;

    @BinaryUuidColumn({ name: 'cart_id', nullable: true })
    cartId?: string | null;

    @BinaryUuidColumn({ name: 'product_id', nullable: true })
    productId?: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;
}