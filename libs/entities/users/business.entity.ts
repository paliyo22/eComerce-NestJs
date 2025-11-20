import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Account } from ".";

@Entity('business_profile')
export class BusinessProfile {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.businessProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 50 })
  contactEmail: string;
}
