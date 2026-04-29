import { Entity, ManyToOne, JoinColumn, Column, CreateDateColumn, Check, Index } from "typeorm";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Product } from "./productEntity";

@Entity('review')
@Check(`rating BETWEEN 1 AND 10`)
@Index('idx_account', ['accountId'])
export class Review {
  constructor(){};

  @PrimaryBinaryUuidColumn({ name: 'product_id' })
  productId: string;

  @PrimaryBinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}