import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, OneToMany } from "typeorm";
import { v4 as uuid } from 'uuid';
import { OrderItem } from "./orderItemEntity";

@Entity('purchase_order')
@Index('idx_account', ['accountId'])
@Index('idx_date', ['created'])
export class Order {
    constructor(){};
    
    @PrimaryBinaryUuidColumn()
    id: string;
    @BeforeInsert()
    generateId() {
        if (!this.id) {
        this.id = uuid();
        }
    }

    @BinaryUuidColumn({ name: 'account_id' })
    accountId: string;

    @BinaryUuidColumn({ name: 'draft_order_id', nullable: true, unique: true })
    draftOrderId: string | null;

    @Column({ name: 'contact_email', type: 'varchar', length: 100 })
    contactEmail: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @Column({ type: 'varchar', length: 250, name: 'shipping' })
    shippingAddress: string;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;

    @OneToMany(() => OrderItem, (item) => item.order, {
        cascade: true,
    })
    items: OrderItem[];
}
