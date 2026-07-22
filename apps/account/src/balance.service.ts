import { Account, badRequest, Balance, EBalanceStatus, errorMessage, EStateStatus, 
    Income, IncomeDto, notFound, SuccessDto, TransactionDto, uuidTransformer, Withdrawal, 
    WithdrawalDto, withRetry } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Redis from "ioredis";
import { firstValueFrom, from } from "rxjs";
import { Repository } from "typeorm";
import { GeneralService } from "./general.service";

@Injectable()
export class BalanceService {
    constructor(
        private readonly generalService: GeneralService,
        @InjectRepository(Balance)
        private readonly balanceRepository: Repository<Balance>,
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
        @InjectRepository(Income)
        private readonly incomeRepository: Repository<Income>,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){};

    private readonly logger = new Logger(BalanceService.name);

    async getBalance(accountId: string): Promise<SuccessDto<number>> {
        try {
            const result = await this.balanceRepository
                .createQueryBuilder('b')
                .where('b.accountId = :id', { id: uuidTransformer.to(accountId) })
                .getOne();

            if(!result){
                return notFound;
            }

            return{
                success: true,
                data: result.amount
            }
        } catch (err: any) {
            return errorMessage(BalanceService.name, err);
        }
    }

    async getWithdrawals(accountId: string): Promise<SuccessDto<WithdrawalDto[]>>{
        try {
            const result = await this.withdrawalRepository
                .createQueryBuilder('w')
                .where('w.accountId = :id', { id: uuidTransformer.to(accountId) })
                .orderBy('w.created', 'DESC')
                .getMany();

            const data = result.map((w) => new WithdrawalDto(w));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(BalanceService.name, err);
        }
    }
    
    async getIncomes(accountId: string): Promise<SuccessDto<IncomeDto[]>>{
        try {
            const result = await this.incomeRepository
                .createQueryBuilder('i')
                .where('i.accountId = :id', { id: uuidTransformer.to(accountId) })
                .orderBy('i.created', 'DESC')
                .getMany();

            const data = result.map((i) => new IncomeDto(i));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(BalanceService.name, err);
        }
    }
    
    async withdraw(accountId: string, amount: number, token: TransactionDto): Promise<SuccessDto<WithdrawalDto>> {
        if(amount <= 0){
            return badRequest;
        };
        const cacheKey = `transaction:${token.uuid}`;
        try {
            const result = await this.balanceRepository.manager.transaction(async (manager): Promise<Withdrawal | 'ERROR' | 'BAD_REQUEST'> => {
                const balance = await manager.createQueryBuilder(Balance, 'b')
                    .setLock('pessimistic_write')
                    .where('b.accountId = :id', { id: uuidTransformer.to(accountId) })
                    .getOne();

                const account = await manager.createQueryBuilder(Account, 'a')
                    .leftJoinAndSelect('a.userProfile', 'u')
                    .leftJoinAndSelect('a.businessProfile', 'b')
                    .where('a.id = :id', { id: uuidTransformer.to(accountId) })
                    .getOne();
                
                if(!balance || !account){
                    return 'ERROR';
                };

                const cbu = account.businessProfile?.cbu ?? account.userProfile?.cbu;
                if(!cbu){
                    return 'BAD_REQUEST';
                };

                await manager.createQueryBuilder()
                    .update(Balance)
                    .set({ status: EBalanceStatus.PROCESSING })
                    .where('accountId = :id', { id: uuidTransformer.to(accountId) })
                    .execute();

                const withdrawal = manager.create(Withdrawal, {
                    token: token.uuid,
                    accountId: accountId,
                    amount: amount,
                    cbu: cbu
                });
                
                const newWithdrawal = await manager.save(Withdrawal, withdrawal, {reload: false});
                let result: Withdrawal;
                if(Number(balance.amount) < amount){
                    await manager.createQueryBuilder()
                        .update(Withdrawal)
                        .set({ status: EStateStatus.Failed })  
                        .where('token = :token', { token: uuidTransformer.to(newWithdrawal.token) })
                        .andWhere('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                        .execute();
                    newWithdrawal.status = EStateStatus.Failed;
                    result = newWithdrawal
                }else{
                    balance.amount = Number(balance.amount) - amount;
                    await manager.save(Balance, balance);
                    await manager.createQueryBuilder()
                        .update(Withdrawal)
                        .set({ status: EStateStatus.Completed })  
                        .where('token = :token', { token: uuidTransformer.to(newWithdrawal.token) })
                        .andWhere('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                        .execute();
                    newWithdrawal.status = EStateStatus.Completed;
                    result = newWithdrawal;
                };
                await manager.createQueryBuilder()
                    .update(Balance)
                    .set({ status: EBalanceStatus.IDLE })
                    .where('accountId = :id', { id: uuidTransformer.to(accountId) })
                    .execute();
                return result;
            });

            if(result === 'BAD_REQUEST'){
                token.status = EStateStatus.Failed;
                await firstValueFrom(
                    from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
                    .pipe(withRetry(3))
                ).catch(() => {});
                return badRequest;
            };
            
            if(result === 'ERROR'){
                token.status = EStateStatus.Failed;
                await firstValueFrom(
                    from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
                    .pipe(withRetry(3))
                ).catch(() => {});
                this.logger.error(`Error finding account: ${accountId} balance.`);
                return errorMessage(BalanceService.name);
            };

            token.status = EStateStatus.Completed;
            await firstValueFrom(
                from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
                .pipe(withRetry(3))
            ).catch(() => {});
            
            return {
                success: true,
                data: new WithdrawalDto(result)
            }
        } catch (err: any) {
            token.status = EStateStatus.Failed;
            await firstValueFrom(
                from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
                .pipe(withRetry(3))
            ).catch(() => {});
            return errorMessage(BalanceService.name, err);
        }finally{
            const lock = `lock:${token.uuid}`;
            await this.generalService.releaseLock(lock, token.uuid); 
            await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
        }
    }
    
}