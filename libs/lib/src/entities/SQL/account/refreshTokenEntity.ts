import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, Index } from "typeorm";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Account } from "./accountEntity";

@Entity('refresh_token')
@Index('idx_expired', ['expiredAt'])
export class RefreshToken {
  constructor(){};
  
  @PrimaryBinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  device: string;

  @Column({ type: 'varchar', length: 1024 })
  token: string;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', name: 'expired_at' })
  expiredAt: Date;
}
