import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity('category')
@Index('idx_slug', ['slug'])
export class Category {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;
}
