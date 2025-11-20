import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Status, Account, Role } from ".";

@Entity('meta')
export class Meta {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @OneToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;

  @Column({ type: 'datetime', nullable: true })
  deleted: Date | null;

  @BinaryUuidColumn({ name: 'deleted_by', nullable: true })
  deletedBy: string | null;

  @BinaryUuidColumn({ name: 'verify_token', nullable: true })
  verifyToken: string | null;

  @ManyToOne(() => Role, (role) => role.metas)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'tinyint', unsigned: true, name: 'role_id', nullable: true })
  roleId: number | null;

  @ManyToOne(() => Status, (status) => status.metas)
  @JoinColumn({ name: 'status_id' })
  status: Status;

  @Column({ type: 'tinyint', unsigned: true, name: 'status_id', nullable: true })
  statusId: number | null;
}
