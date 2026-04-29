import { Withdrawal } from "../../../entities/SQL/account/withdrawalEntity";
import { EStateStatus } from "../../../enums/EStateStatus";


export class WithdrawalDto {
    amount: number;
    status: EStateStatus;
    cbu: string;
    created: Date;

    constructor(withdrawal: Withdrawal){
        this.amount = withdrawal.amount;
        this.status = withdrawal.status;
        this.cbu = withdrawal.cbu;
        this.created = new Date(withdrawal.created);
    };
}