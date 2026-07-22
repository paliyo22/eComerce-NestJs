import { Account, errorMessage, EStateStatus, notFound, SuccessDto, TransactionDto, 
    uuidTransformer, withRetry } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "bcrypt";
import Redis from "ioredis";
import { Repository } from "typeorm";
import { AccountService } from "./account.service";
import { firstValueFrom, from } from "rxjs";
import EventEmitter from "events";

@Injectable()
export class GeneralService {

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @Inject('REDIS_CLIENT')
        private redis: Redis,
    ){
        this.subscriber = this.redis.duplicate();
        this.setupGlobalSubscriber();
    };

    private subscriber: Redis;

    private responseEmitter = new EventEmitter();
      
    private readonly logger = new Logger(GeneralService.name);

    private setupGlobalSubscriber() {
        const pattern = 'transaction:done:*';
        this.subscriber.psubscribe(pattern);
        this.subscriber.on('pmessage', (_, channel, message) => {
        this.responseEmitter.emit(channel, message);
        });
        this.subscriber.on('error', (err) => {
        this.logger.error('Global subscriber error', err);
        });
    };

    completeAccount() {
        return this.accountRepository
        .createQueryBuilder('account')
        .innerJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('meta.status', 'status')
        .leftJoinAndSelect('account.userProfile', 'userProfile')
        .leftJoinAndSelect('account.businessProfile', 'businessProfile')
        .leftJoinAndSelect('account.adminProfile', 'adminProfile')
        .leftJoinAndSelect('account.stores', 'store')
        .leftJoinAndSelect('store.address', 'storeAddress')
        .leftJoinAndSelect('account.addresses', 'address');
    };

    partialAccount() {
        return this.accountRepository
        .createQueryBuilder('a')
        .innerJoinAndSelect('a.meta', 'm')
        .leftJoinAndSelect('m.role', 'r')
        .leftJoinAndSelect('m.status', 's');
    };
  
    async hashPassword(raw: string): Promise<string> {
        return hash(raw, this.config.get<number>('SALT'));
    }

    async getAccount (accountId: string): Promise<SuccessDto<Account>> {
        try {
            const qb = this.completeAccount();
            const account = await qb
                .where('account.id = :id', { id: uuidTransformer.to(accountId) })
                .getOne();
    
            if (!account) {
                return notFound;
            }
        
            return { 
                success: true, 
                data: account 
            };
        } catch (err: any) {
            return errorMessage(AccountService.name, err);
        }
    }
    
    async getPartialAccount (id: string): Promise<SuccessDto<Account>> {
        try {
            const qb = this.partialAccount();
            const account = await qb.where('a.id = :id', { id: uuidTransformer.to(id) })
                .getOne();
        
            if (!account) {
                return notFound;
            }
        
            return { 
                success: true, 
                data: account
            };
        } catch (err: any) {
            return errorMessage(AccountService.name, err);
        }
    }
    
    async releaseLock(lockKey: string, token: string): Promise<void> {
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        await this.redis.eval(luaScript, 1, lockKey, token).catch(() => {});
    }

    async waitForTransaction(token: TransactionDto, timeoutMs: number): Promise<'completed' | 'failed'> {    
        return new Promise((resolve) => {
            const channel = `transaction:done:${token.uuid}`;
            const handleMessage = (status: string) => {
                cleanup();
                resolve(status === EStateStatus.Completed ? 'completed' : 'failed');
            };
        
            const cleanup = () => {
                clearTimeout(timer);
                this.responseEmitter.removeListener(channel, handleMessage);
            };
        
            const timer = setTimeout(() => {
                cleanup();
                resolve('failed');
            }, timeoutMs);
        
            this.responseEmitter.on(channel, handleMessage);
        });
    }
    
    async check(token: TransactionDto): Promise<'completed' | 'failed' | 'try'> {
        const timeout = token.isInternal ? (this.config.get<number>('MESSAGE_TIMEOUT') + 1000) : 3100;
        const cacheKey = `transaction:${token.uuid}`;
        const cached = await firstValueFrom(from(this.redis.get(cacheKey)).pipe(withRetry(3))).catch(() => undefined);
        const lock = `lock:${token.uuid}`;
        const locked = await this.redis.set(lock, token.uuid, 'EX', 100, 'NX').catch(() => undefined);
        if(!locked){
            return await this.waitForTransaction(token, timeout);
        }else{
            if(cached){
                const result = JSON.parse(cached) as TransactionDto;
                if(result.status !== EStateStatus.Pending){
                const lock = `lock:${token.uuid}`;
                await this.releaseLock(lock, token.uuid).catch(() => {});    
                return result.status === EStateStatus.Completed ? 'completed' : 'failed';
                }
            }else{
                await firstValueFrom(
                from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
                .pipe(withRetry(3)))
                .catch(() => undefined);
            };
            return 'try';
        } 
    }
}