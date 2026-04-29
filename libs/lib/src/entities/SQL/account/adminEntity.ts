import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Account } from "./accountEntity";

@Entity('admin_profile')
export class AdminProfile {
  constructor(){};
  
  @PrimaryGeneratedColumn('increment', { type: 'bigint' ,unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.adminProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'public_name', type: 'varchar', length: 20, unique: true })
  publicName: string;
}
