import { Account, AccountDto, Balance, ERole, errorMessage, EStateStatus, getRoleGroup, Income, PartialAccountDto, SuccessDto, TransactionDto, unauthorized, uuidTransformer, withRetry } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { firstValueFrom, from } from "rxjs";
import { GeneralService } from "./general.service";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class EventService {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @Inject('REDIS_CLIENT')
        private redis: Redis,
        private readonly generalService: GeneralService
    ){};

    private readonly logger = new Logger(EventService.name);

    async getAccountListInfo(accountIds: string[]): Promise<SuccessDto<AccountDto[]>> {
        try {
            if (!accountIds.length) {
                return { 
                    success: true, 
                    data: [] 
                };
            }

            const ids = accountIds.map((a) => uuidTransformer.to(a));
            const qb = this.generalService.completeAccount();
            const account = await qb.where('account.id IN (:...ids)', { ids }).getMany();

            const data = account.map((acc) => new AccountDto(acc));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }
    
    async getPartialAccountListInfo(accountIds: string[]): Promise<SuccessDto<PartialAccountDto[]>> {
        try {
            if (!accountIds.length) {
                return { 
                    success: true, 
                    data: [] 
                };
            };

            const ids = accountIds.map((a) => uuidTransformer.to(a));
            const qb = this.generalService.partialAccount();
            const account = await qb.where('a.id IN (:...ids)', { ids }).getMany();

            const data = account.map((acc) => new PartialAccountDto(acc));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }
    
    async addToBalance(accounts: {accountId: string, balance: number, orderId: string}[], token: TransactionDto): Promise<void> {
        const failures: { id: string; amount: number; error: any }[] = [];
        const cacheKey = `transaction:${token.uuid}`;

        for (const a of accounts) {
            try {
                await this.accountRepository.manager.transaction(async manager => {
                    await manager.increment(Balance,
                        { accountId: a.accountId },
                        'amount',
                        a.balance
                    );
                    await manager.insert(Income, { token: token.uuid, accountId: a.accountId, orderId: a.orderId, amount: a.balance });
                });
            } catch (err: any) {
                failures.push({ id: a.accountId, amount: a.balance, error: err?.message ?? err });
            }
        }

        if (failures.length) {
            this.logger.fatal(`addToBalance failed for ${failures.length} accounts: \n${failures}`);
        }
        token.status = EStateStatus.Completed;
        await firstValueFrom(
            from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
            .pipe(withRetry(3)))
            .catch(() => undefined);
        const lock = `lock:${token.uuid}`;
        await this.generalService.releaseLock(lock, token.uuid);
        await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
    }

    async isAdmin(adminId: string): Promise<SuccessDto<void>> {
        try{
            const verify = await this.generalService.getPartialAccount(adminId);
            
            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            return {
                success: true
            };
        }catch (err: any) {
            return errorMessage(EventService.name, err);
        }
    }
}