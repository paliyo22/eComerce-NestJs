import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, Check } from "typeorm";
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Account } from "./accountEntity";

@Entity('user_profile')
@Check('cbu IS NULL OR CHAR_LENGTH(cbu) = 22')
export class UserProfile {
  constructor(){};
  
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.userProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 50 })
  firstname: string;

  @Column({ type: 'varchar', length: 50 })
  lastname: string;

  @Column({ type: 'date', nullable: true })
  birth: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 22, nullable: true })
  cbu: string | null;
}
