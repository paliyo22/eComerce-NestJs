import { Entity, Column, ManyToOne, JoinColumn, JoinTable, ManyToMany, OneToMany, PrimaryColumn, OneToOne } from "typeorm";
import { Category } from "./category.entity";
import { Tag } from "./tag.entity";
import { Meta } from "./meta.entity";
import { Review } from "./review.entity";
import { Image } from "./image.entity";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";
import { PrimaryBinaryUuidColumn } from "libs/shared/primari-binary.decorator";

@Entity('product')
export class Product {
  @PrimaryBinaryUuidColumn({ name: 'id' })
  id: string;

  @BinaryUuidColumn({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 250 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0, name: 'discount_percentage' })
  discountPercentage: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'float' })
  weight: number;

  @Column({ type: 'varchar', length: 250, nullable: true, name: 'warranty_info' })
  warrantyInfo?: string;

  @Column({ type: 'varchar', length: 250, nullable: true, name: 'shipping_info' })
  shippingInfo?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'rating_avg' })
  ratingAvg: number;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'tinyint', unsigned: true, name: 'category_id', insert: false, update: false })
  categoryId: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  @Column({ type: 'boolean', default: true })
  physical: boolean;

  @OneToOne(() => Meta, (meta) => meta.product)
  meta: Meta;

  @ManyToMany(() => Tag, (tag) => tag.products)
  @JoinTable({
    name: 'prod_x_tag',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @OneToMany(() => Image, (image) => image.product)
  images: Image[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];
}