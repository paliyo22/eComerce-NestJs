import { Entity, Column, ManyToOne, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, Check, BeforeInsert, Index } from "typeorm";
import { v4 as uuid } from 'uuid';
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Category } from "./categoryEntity";
import { MetaP } from "./metaPEntity";
import { Review } from "./reviewEntity";
import { Tag } from "./tagEntity";
import { Image } from "./imageEntity"  

@Check('price >= 0')
@Check('weight >= 0')
@Check('discount_percentage BETWEEN 0 AND 100')
@Entity('product')
@Index('idx_stock', ['stock'])
@Index('idx_category', ['categoryId'])
@Index('idx_price', ['price'])
@Index('idx_rating', ['ratingAvg'])
export class Product {
  constructor(){};
  
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @Column({ type: 'varchar', length: 250 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0, name: 'discount_percentage' })
  discountPercentage: number;

  @Column({ type: 'smallint', unsigned: true, default: 0 })
  stock: number;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'float' })
  weight: number;

  @Column({ type: 'varchar', length: 250, nullable: true, name: 'warranty_info' })
  warrantyInfo: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true, name: 'shipping_info' })
  shippingInfo: string | null; 

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'rating_avg' })
  ratingAvg: number;

  @Column({ type: 'tinyint', unsigned: true, name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string | null;

  @Column({ type: 'boolean', default: true })
  physical: boolean;

  @OneToOne(() => MetaP, (meta) => meta.product)
  meta: MetaP;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'prod_x_tag',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: Tag[];

  @OneToMany(() => Image, (image) => image.product)
  images?: Image[];

  @OneToMany(() => Review, (review) => review.product)
  reviews?: Review[];
}