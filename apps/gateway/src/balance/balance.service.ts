import { SuccessDto, WithdrawalDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { errorManager } from '../helpers/errorManager';
import { firstValueFrom } from "rxjs";

@Injectable()
export class BalanceService {
    constructor(
        @Inject('ACCOUNT_SERVICE')
        private readonly accountClient: ClientProxy
    ){}

    async withdrawalList(accountId: string): Promise<WithdrawalDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<WithdrawalDto[]>>(
                    { cmd: 'get_withdrawal_list'},
                    { accountId }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'balance')
        }
    }

    async withdraw(accountId: string, amount: number): Promise<void | WithdrawalDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<WithdrawalDto>>(
                    { cmd: 'withdraw'},
                    { accountId, amount }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            if(result.data){
                return result.data;
            };
        } catch (err: any) {
            throw errorManager(err, 'balance')
        }
    }

    async getBalance(accountId: string): Promise<number> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<number>>(
                    { cmd: 'get_balance'},
                    { accountId }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'balance')
        }
    }
}