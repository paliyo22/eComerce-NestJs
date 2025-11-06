import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Account } from ".";

@Entity('user_profile')
export class UserProfile {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @OneToOne(() => Account, (account) => account.userProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', unique: true })
  accountId: string;

  @Column({ type: 'varchar', length: 50 })
  firstname: string;

  @Column({ type: 'varchar', length: 50 })
  lastname: string;

  @Column({ type: 'date', nullable: true })
  birth: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;
}
