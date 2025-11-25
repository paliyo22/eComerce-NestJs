import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Account } from ".";

@Entity('admin_profile')
export class AdminProfile {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.adminProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @Column({ name: 'public_name', type: 'varchar', length: 20, unique: true })
  publicName: string;
}
