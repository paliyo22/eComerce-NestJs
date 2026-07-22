import { EStateStatus, TransactionDto, withRetry } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientProxy } from "@nestjs/microservices";
import EventEmitter from "events";
import Redis from "ioredis";
import { firstValueFrom, from, retry, timeout } from "rxjs";

@Injectable()
export class GeneralService {
    constructor(
        private readonly config: ConfigService, 
        @Inject('CART_SERVICE') 
        private readonly cartClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){
        this.subscriber = this.redis.duplicate();
        this.setupGlobalSubscriber();
    }

    private readonly logger = new Logger(GeneralService.name);
    private subscriber: Redis;
    private responseEmitter = new EventEmitter();

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

    

    async deleteFromCarts(productIds: string[]): Promise<void> {
        await firstValueFrom(
            this.cartClient.emit('delete.products.from.carts', { productIds })
            .pipe(retry(1), timeout(100))
        ).catch(() => {
            this.logger.error('Failed to emit the message from the method "deleteFromCarts"');
        });
    };

    async releaseLock(lockKey: string, token: string): Promise<void> {
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        await this.redis.eval(luaScript, 1, lockKey, token).catch(() => {});
    };

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
    };

    async deleteCache(cache: 'product' | 'featured' | 'myProducts', id?: string){
        switch(cache){
            case 'featured':
                await this.redis.del(`featured:10`).catch(() => {});
                break;
            case 'myProducts':
                await this.redis.del(`myProducts:${id}`).catch(() => {});
                break;
            case 'product':
                await this.redis.del(`product:${id}`).catch(() => {});
                break;
        };
    };

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
                    .pipe(withRetry(3))
                ).catch(() => {});
            };
            return 'try';
        };
    };
}