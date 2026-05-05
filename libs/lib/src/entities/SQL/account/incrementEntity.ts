import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Account } from "./accountEntity";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";

@Entity('increment')
@Check('amount > 0')
@Index('idx_account', ['accountId'])
export class Increment {
    constructor(){};
    
    @PrimaryBinaryUuidColumn()
    token: string;

    @ManyToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @PrimaryBinaryUuidColumn({ name: 'account_id' })
    accountId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @CreateDateColumn({ type: 'datetime' })
    created: Date;
}