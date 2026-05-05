import { EStateStatus, TransactionDto } from "@app/lib";
import { HttpException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class GeneralService {
    constructor(
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){}

    async transactionResult(uuid: string): Promise<EStateStatus>{
        const cacheKey = `transaction:${uuid}`;
        const cached = await this.redis.get(cacheKey).catch(() => { throw new InternalServerErrorException() });
        
        if(!cached){
            throw new HttpException('already resolved', 410);
        };

        const result = JSON.parse(cached) as TransactionDto;
        
        return result.status;
    }
}