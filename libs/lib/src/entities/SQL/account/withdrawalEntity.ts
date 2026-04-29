import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Account } from "./accountEntity";
import { EStateStatus } from "../../../enums/EStateStatus";

@Entity('withdrawal')
@Check('amount > 0')
@Index('idx_account', ['accountId'])
export class Withdrawal {
    constructor(){};
    
    @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
    id: number;

    @ManyToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @BinaryUuidColumn({ name: 'account_id' })
    accountId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 22 })
    cbu: string;

    @Column({ type: 'enum', enum: EStateStatus, default: EStateStatus.Pending })
    status: EStateStatus;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;
}