import { CreateStoreDto, StoreDto, SuccessDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { errorManager } from "../helpers/errorManager";

@Injectable()
export class StoreService {
    constructor (
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
    ) {};

    async getStores(accountId?: string, username?: string): Promise<StoreDto[]> {
        try {
            if(!accountId && !username){
                throw new HttpException('BAD_REQUEST', 400);
            }
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<StoreDto[]>>(
                    {cmd: 'get_stores'},
                    { accountId, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'store');
        }   
    }

    async addStore(accountId: string, store: CreateStoreDto): Promise<StoreDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<StoreDto>>(
                    {cmd: 'add_store'},
                    { accountId, store }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'store');
        }   
    }

    async deleteStore(accountId: string, storeId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_store'},
                    { accountId, storeId }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, 'store');
        }   
    }
}