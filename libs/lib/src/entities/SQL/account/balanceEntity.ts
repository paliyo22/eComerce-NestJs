import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Account } from "./accountEntity";
import { EBalanceStatus } from "../../../enums/EBalanceStatus";

@Entity('balance')
export class Balance {
    constructor(){};
    
    @PrimaryBinaryUuidColumn({ name: 'account_id' })
    accountId: string;

    @OneToOne(() => Account, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00})
    amount: number;

    @Column({ type: 'enum', enum: EBalanceStatus, default: EBalanceStatus.IDLE })
    status: EBalanceStatus;
}