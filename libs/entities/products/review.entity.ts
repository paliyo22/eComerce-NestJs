import { Entity, ManyToOne, JoinColumn, Column, CreateDateColumn, Check, PrimaryColumn } from "typeorm";
import { Product } from "./product.entity";
import { PrimaryBinaryUuidColumn } from "libs/shared/primari-binary.decorator";

@Entity('review')
@Check(`rating BETWEEN 1 AND 10`)
export class Review {

  @PrimaryBinaryUuidColumn({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @PrimaryBinaryUuidColumn({ name: 'user_id' })
  userId: string;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;
}



