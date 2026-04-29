import { Entity, Column, CreateDateColumn, Check, Index, BeforeInsert, OneToMany } from "typeorm";
import { v4 as uuid } from 'uuid';
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { EStateStatus } from "../../../enums/EStateStatus";
import { DraftItem } from "./draftItemEntity";

@Check(`total > 0`)
@Entity('draft_order')
@Index('idx_account', ['accountId'])
@Index('idx_created', ['created'])
export class DraftOrder {
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

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;

    @Column({ type: 'varchar', length: 250, name: 'shipping' })
    shippingAddress: string;

    @Column({ name: 'contact_email', type: 'varchar', length: 100 })
    contactEmail: string;

    @BinaryUuidColumn({ name: 'order_id', nullable: true })
    orderId: string | null;

    @Column({ type: 'enum', enum: EStateStatus, default: EStateStatus.Pending })
    status: EStateStatus;

    @OneToMany(() => DraftItem, (item) => item.draftOrder, {
        cascade: true,
    })
    items: DraftItem[];
}