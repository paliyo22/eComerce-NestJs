import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { Account } from "./accountEntity";
import { Role } from "./roleEntity";
import { Status } from "./statusEntity";

@Entity('meta')
@Index('idx_status', ['statusId'])
@Index('idx_role', ['roleId'])
@Index('idx_deleted', ['deleted'])
export class MetaA {
  constructor(){};
  
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @OneToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted: Date | null;

  @BinaryUuidColumn({ name: 'deleted_by', nullable: true })
  deletedBy: string | null;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'tinyint', unsigned: true, name: 'role_id', default: 1 })
  roleId: number;

  @ManyToOne(() => Status)
  @JoinColumn({ name: 'status_id' })
  status: Status;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', default: 1 })
  statusId: number;
}