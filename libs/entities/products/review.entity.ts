import { Entity, ManyToOne, JoinColumn, Column, CreateDateColumn, Check, PrimaryColumn } from "typeorm";
import { Product } from "./product.entity";
import { PrimaryBinaryUuidColumn } from "libs/shared/primari-binary.decorator";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";

@Entity('review')
@Check(`rating BETWEEN 1 AND 10`)
export class Review {
  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @BinaryUuidColumn({ name: 'product_id', insert: false, update: false })
  productId: string;

  @PrimaryBinaryUuidColumn({ name: 'user_id' })
  userId: string;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;
}


