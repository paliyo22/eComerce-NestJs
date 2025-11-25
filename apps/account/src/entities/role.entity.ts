import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Meta } from ".";

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @OneToMany(() => Meta, (meta) => meta.role)
  metas: Meta[];
}
