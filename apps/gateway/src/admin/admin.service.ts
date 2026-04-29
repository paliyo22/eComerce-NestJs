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
        private readonly accountClient: ClientProxy
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
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
        }   
    }

    async searchAccount(adminId: string, contain: string): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountOutputDto[]>>(
                    {cmd: 'search_account'},
                    { adminId, contain }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }   
    }

    async getAccountInfo(password: string, username: string): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountOutputDto>>(
                    {cmd: 'get_account_info'},
                    { password, username }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }   
    }

    async addAdmin(password: string, account: CreateAccountDto): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    { cmd: 'create_admin' },
                    { password, account }
                ).pipe(withRetry())
            );

            if(!result.success){
                throw new HttpException(result.message!, result.code!);
            }
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }
    }

    async banAccount(adminId: string, mail: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'ban_account'},
                    { adminId, mail }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }   
    }

    async unbanAccount(adminId: string, mail: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'restore_account'},
                    { adminId, mail }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }   
    }

    async suspendAccount(adminId: string, mail: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'suspend_account'},
                    { adminId, mail }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'admin');
        }   
    }
    //---------------------- PRODUCT SERVICE -----------------------
    async calculateRating(): Promise<void> {
        try {
            await firstValueFrom(
                this.productClient.emit('calculate.rating', {})
                    .pipe(withRetry())
            );
        } catch (err: any) {
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
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
            throw errorManager(err, 'admin');
        }
    }
}