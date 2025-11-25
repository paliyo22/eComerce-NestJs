import { Entity, Unique, PrimaryColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from "typeorm";
import { Account } from ".";
import { BinaryUuidColumn } from "libs/shared";

@Entity('refresh_token')
@Unique(['accountId', 'device'])
export class RefreshToken {
  @PrimaryColumn({ type: 'varchar', length: 600 })
  id: string;

  @ManyToOne(() => Account, (account) => account.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @Column({ type: 'varchar', length: 255 })
  device: string;

  @Column({ type: 'varchar', length: 50 })
  ip: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', name: 'expired_at' })
  expiredAt: Date;
}
