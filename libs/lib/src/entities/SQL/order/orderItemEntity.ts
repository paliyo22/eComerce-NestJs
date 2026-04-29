import { Entity, Column, ManyToOne, JoinColumn, Check, Index } from "typeorm";
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Order } from "./orderEntity";

@Check('discount_percentage BETWEEN 0 AND 100')
@Check(`price >= 0`)
@Entity('order_item')
@Index('idx_seller', ['sellerId'])
@Index('idx_product', ['productId'])
@Index('idx_seller_order', ['sellerId', 'orderId'])
export class OrderItem {
    constructor(){};
    
    @PrimaryBinaryUuidColumn({ name: 'order_id' })
    orderId: string;

    @PrimaryBinaryUuidColumn({ name: 'product_id' })
    productId: string;

    @BinaryUuidColumn({ name: 'seller_id' })
    sellerId: string;

    @Column({ name: 'product_title', type: 'varchar', length: 250 })
    productTitle: string;

    @Column({ name: 'seller_title', type: 'varchar', length: 250 })
    sellerTitle: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'smallint', unsigned: true })
    amount: number;

    @Column({ type: 'tinyint', default: 0, name: 'discount_percentage', unsigned: true })
    discountPercentage: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    subtotal: number;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;
}