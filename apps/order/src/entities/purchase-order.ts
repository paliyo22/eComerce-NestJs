import { BinaryUuidColumn, PrimaryBinaryUuidColumn } from "libs/shared";
import { BeforeInsert, Column, CreateDateColumn, Entity, OneToMany } from "typeorm";
import { OrderItem } from "./order-item";
import { v4 as uuid } from 'uuid';

@Entity('purchase_order')
export class PurchaseOrder {
    @PrimaryBinaryUuidColumn()
    id: string;
    @BeforeInsert()
    generateId() {
        if (!this.id) {
        this.id = uuid();
        }
    }

    @BinaryUuidColumn({ name: 'user_id' })
    userId: string;

    @BinaryUuidColumn({ name: 'seller_id' })
    sellerId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;

    @OneToMany(() => OrderItem, (item) => item.order, {
        cascade: true,
    })
    items: OrderItem[];
}
