import { EAccountStatus } from "../../../enums/EAccountStatus";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('status')
export class Status {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: EAccountStatus;
}
