import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { Product } from "./product.entity";

@Entity('tag')
export class Tag {
  @PrimaryGeneratedColumn({ type: 'smallint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  title: string;

  @ManyToMany(() => Product, (product) => product.tags)
  products: Product[];
}
