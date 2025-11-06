import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Meta } from ".";

@Entity('status')
export class Status {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @OneToMany(() => Meta, (meta) => meta.status)
  metas: Meta[];
}
