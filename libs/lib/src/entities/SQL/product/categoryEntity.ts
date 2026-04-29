import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('category')
export class Category {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;
}
