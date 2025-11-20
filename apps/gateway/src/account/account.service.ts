import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CreateAdminDto } from 'libs/dtos/acount/createAdmin';
import { AccountDto, CreateBussinessDto, CreateUserDto } from 'libs/dtos/acount';
import { AccountOutputDto } from './acount-dto';
import { UpdateAccountDto } from 'libs/dtos/acount/update-account';

@Injectable()
export class AccountService {
    constructor (
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        private readonly authService: AuthService
    ) {};

    async getInfo(userId: string): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountInfo = AccountOutputDto.fromEntity(result.data!);

            return accountInfo;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async addAdmin(account: CreateAdminDto): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto>>(
                    {cmd: 'add_admin'},
                    { account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const partialAccount = result.data!;

            const jwtAccess = await this.authService.generateJwt(partialAccount);

            return { partialAccount, jwtAccess };
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async addBusiness(account: CreateBussinessDto): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto>>(
                    {cmd: 'add_business'},
                    { account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const partialAccount = result.data!;

            const jwtAccess = await this.authService.generateJwt(partialAccount);

            return { partialAccount, jwtAccess };
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
            
    }

    async addUser(account: CreateUserDto): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto>>(
                    {cmd: 'add_user'},
                    { account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const partialAccount = result.data!;

            const jwtAccess = await this.authService.generateJwt(partialAccount);

            return { partialAccount, jwtAccess };
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async updateUser(userId: string, account: UpdateAccountDto): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'update_user'},
                    { userId, account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountInfo = AccountOutputDto.fromEntity(result.data!);

            return accountInfo;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async updateBusiness(userId: string, account: UpdateAccountDto): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'update_business'},
                    { userId, account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountInfo = AccountOutputDto.fromEntity(result.data!);

            return accountInfo;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }
    
    async updateAdmin(userId: string, account: UpdateAccountDto): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'update_admin'},
                    { userId, account }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountInfo = AccountOutputDto.fromEntity(result.data!);

            return accountInfo;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }
}
