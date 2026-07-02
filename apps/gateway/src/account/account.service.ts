import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SuccessDto, PartialAccountDto, AccountOutputDto, withRetry, 
    CreateAccountDto, UpdateAccountDto } from '@app/lib';
import { errorManager } from "../helpers/errorManager";
import { PublicAccountDto } from '@app/lib/dtos/api/account/publicAccountDto';

@Injectable()
export class AccountService {
    constructor (
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        private readonly authService: AuthService
    ) {};

    async getInfo(accountId: string): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountOutputDto>>(
                    {cmd: 'get_info'},
                    { accountId }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }   
    }

    async addAccount(
        account: CreateAccountDto,
        ip?: string, 
        device?: string
    ): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string } | void>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto>>(
                    {cmd: 'add_account'},
                    { account, ip, device }
                ).pipe(withRetry())
            );

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
            if(result.data){
                const jwtAccess = await this.authService.generateJwt(result.data);
                return { partialAccount: result.data, jwtAccess }; 
            }
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }   
    }

    async updateAccount(
        accountId: string, 
        account: UpdateAccountDto
    ): Promise<AccountOutputDto | void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountOutputDto>>(
                    {cmd: 'update_account'},
                    { accountId, account }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
            if(result.data){
                return result.data;
            };
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }   
    }

    async deleteAccount(accountId: string, password: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_account'},
                    { accountId, password }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }   
    }

    async changePassword(accountId: string, oldPassword: string, newPassword: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'change_password'},
                    { accountId, oldPassword, newPassword }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, AccountService.name);
        } 
    }

    async changeCBU(accountId: string, password: string, newCBU: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'change_cbu'},
                    { accountId, password, newCBU }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }
    }

    async getPublicInfo(username: string): Promise<PublicAccountDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PublicAccountDto>>(
                    { cmd: 'get_public_account' },
                    { username }
                ).pipe(withRetry())
            );

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data;
        } catch (err) {
            throw errorManager(err, AccountService.name);
        }
    }
}
