import { uuidTransformer } from "libs/shared";
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Check } from "typeorm";
import { PurchaseOrder } from "./purchase-order";

@Check('discount_percentage BETWEEN 0 AND 100')
@Entity('order_item')
export class OrderItem {
    @PrimaryColumn({
        name: 'order_id', type: 'binary',
        length: 16, transformer: uuidTransformer
    })
    orderId: string;

    @PrimaryColumn({
    name: 'product_id', type: 'binary',
    length: 16, transformer: uuidTransformer
    })
    productId: string;

    @Column({ type: 'smallint', unsigned: true })
    amount: number;

    @Column({ type: 'int', default: 0, name: 'discount_percentage' })
    discountPercentage: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total: number;

    @ManyToOne(() => PurchaseOrder, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: PurchaseOrder;
}