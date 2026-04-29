import { ERole } from "../../../enums/ERole";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity('role')
export class Role {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: ERole;
}