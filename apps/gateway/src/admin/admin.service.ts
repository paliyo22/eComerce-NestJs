import { Injectable, Inject, HttpException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { AccountOutputDto, CreateAccountDto, PartialAccountOutputDto, PartialProductDto, SuccessDto, 
    withRetry } from "@app/lib";
import { errorManager } from "../helpers/errorManager";

@Injectable()
export class AdminService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        @Inject('ORDER_SERVICE') 
        private readonly orderClient: ClientProxy
    ) {};
    //-------------------- ACCOUNT CLIENT ------------------------
    async getAccountList(adminId: string, limit?: number, offset?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'get_active_list'},
                    { adminId, limit, offset }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async getAccountBannedList(adminId: string, limit?: number, offset?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'get_banned_list'},
                    { adminId, limit, offset }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async getAccountSuspendedList(adminId: string, limit?: number, offset?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'get_suspended_list'},
                    { adminId, limit, offset }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async getAccountInactiveList(adminId: string, limit?: number, offset?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'get_inactive_list'},
                    { adminId, limit, offset }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async searchAccount(adminId: string, contains: string): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'search_account'},
                    { adminId, contains }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async getAccountInfo(adminId: string, username: string): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountOutputDto>>(
                    {cmd: 'get_account_info'},
                    { adminId, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async addAdmin(adminId: string, account: CreateAccountDto): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    { cmd: 'create_admin' },
                    { adminId, account }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }

    async banAccount(adminId: string, username: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'ban_account'},
                    { adminId, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async unbanAccount(adminId: string, username: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'unban_account'},
                    { adminId, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }

    async suspendAccount(adminId: string, username: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'suspend_account'},
                    { adminId, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }   
    }
    //---------------------- PRODUCT SERVICE -----------------------
    async calculateRating(): Promise<void> {
        try {
            this.productClient.emit('calculate.rating', {})
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }

    async banProduct(adminId: string, productId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'ban_product' },
                    { adminId, productId}
                ).pipe(withRetry())
            );

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }

    async unbanProduct(adminId: string, productId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'unban_product' },
                    { adminId, productId}
                ).pipe(withRetry())
            );

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }

    async getBannedProducts(adminId: string, limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_banned_list' },
                    { adminId, limit, offset }
                ).pipe(withRetry())
            );

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }

    //-------------------------- ORDER ----------------------------
    async cleanDraftOrders(): Promise<void> {
        try {
            this.orderClient.emit('clean.draft.orders', {})
        } catch (err: any) {
            throw errorManager(err, AdminService.name);
        }
    }
}