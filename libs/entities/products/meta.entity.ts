import { Entity, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from "typeorm";
import { Product } from "./product.entity";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";

@Entity('meta')
export class Meta {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @BinaryUuidColumn({ name: 'product_id', insert: false, update: false })
  productId: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;
}