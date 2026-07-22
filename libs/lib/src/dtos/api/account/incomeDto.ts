import { Income } from "../../../entities/SQL/account/incomeEntity";

export class IncomeDto {
    amount: number;
    orderId: string;
    created: Date;

    constructor(incomes: Income){
        this.amount = Number(incomes.amount);
        this.orderId = incomes.orderId;
        this.created = incomes.created;
    }
}