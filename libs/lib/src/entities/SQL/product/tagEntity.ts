import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('tag')
export class Tag {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'smallint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  title: string;
}
