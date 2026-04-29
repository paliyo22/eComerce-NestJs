import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Index } from "typeorm";
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Product } from "./productEntity";

@Entity('image')
@Index('idx_product', ['productId'])
export class Image {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @BinaryUuidColumn({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'varchar', length: 500 })
  link: string;
}
