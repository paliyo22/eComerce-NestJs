import { EStateStatus, IncomeDto, SuccessDto, TransactionDto, WithdrawalDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { errorManager } from '../helpers/errorManager';
import { firstValueFrom, from } from "rxjs";
import { v4 as uuidv4 } from 'uuid';
import Redis from "ioredis";


@Injectable()
export class BalanceService {
    constructor(
        @Inject('ACCOUNT_SERVICE')
        private readonly accountClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
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
            throw errorManager(err, BalanceService.name);
        }
    }

    async withdraw(accountId: string, amount: number): Promise<void | WithdrawalDto> {
        const token = new TransactionDto(uuidv4(), false, EStateStatus.Pending);
        const cacheKey = `transaction:${token.uuid}`;
        try {
            await firstValueFrom( from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 120))
                .pipe(withRetry()))
                .catch(() => { throw new HttpException('INTERNAL_ERROR', 500) });
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<WithdrawalDto>>(
                    { cmd: 'withdraw'},
                    { accountId, amount, token }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            if(result.data){
                return result.data;
            };
        } catch (err: any) {
            const cache = await this.redis.get(cacheKey).catch(() => undefined);
            if(cache){
                const transaction = JSON.parse(cache) as TransactionDto;
                if(transaction.status === EStateStatus.Completed){
                    return;
                };
                if(transaction.status === EStateStatus.Failed){
                    throw new HttpException('INTERNAL_ERROR', 500);
                };
                throw new HttpException({
                    message: 'TRANSACTION_PENDING',
                    data: token.uuid
                }, 504);
            };
            throw errorManager(err, BalanceService.name);
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
            throw errorManager(err, BalanceService.name);
        }
    }

    async incomeList(accountId: string): Promise<IncomeDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<IncomeDto[]>>(
                    { cmd: 'get_income_list'},
                    { accountId }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, BalanceService.name);
        }
    }
}