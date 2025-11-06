import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from "typeorm";
import { Product } from "./product.entity";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";

@Entity('image')
export class Image {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @BinaryUuidColumn({ name: 'product_id', insert: false, update: false })
  productId: string;

  @Column({ type: 'varchar', length: 500 })
  link: string;
}