import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, Check } from "typeorm";
import { Account } from "./accountEntity";

@Entity('business_profile')
@Check('cbu IS NULL OR CHAR_LENGTH(cbu) = 22')
export class BusinessProfile {
  constructor(){};
  
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.businessProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 22, nullable: true })
  cbu: string | null;
}
