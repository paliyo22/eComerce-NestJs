import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AccountOutputDto, PartialAccountOutputDto } from './acount-dto';
import { AccountDto, CreateAdminDto, CreateBusinessDto, CreateUserDto, UpdateAdminDto, UpdateBusinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { ERole } from 'libs/shared/role-enum';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';

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

    async addAccount(account: CreateUserDto | CreateAdminDto | CreateBusinessDto): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto>>(
                    {cmd: 'add_account'},
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

    async updateAccount(
        accountId: string, 
        account: UpdateAdminDto | UpdateBusinessDto | UpdateUserDto,
        role: ERole
    ): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'update_account'},
                    { accountId, account, role }
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

    async addAddress(accountId: string, address: CreateAddressDto): Promise<AddressDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AddressDto[]>>(
                    {cmd: 'add_address'},
                    { accountId, address }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async deleteAddress(accountId: string, addressId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_address'},
                    { accountId, addressId }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async addStore(accountId: string, store: CreateStoreDto): Promise<StoreDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<StoreDto[]>>(
                    {cmd: 'add_store'},
                    { accountId, store }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async deleteStore(accountId: string, storeId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_store'},
                    { accountId, storeId }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async deleteAccount(accountId: string, password: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_account'},
                    { accountId, password }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async changeBannedStatust(adminId: string, username: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'ban_unban'},
                    { adminId, username }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async getAccountList(adminId: string, limit?: number, offset?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    {cmd: 'get_account_list'},
                    { adminId, limit, offset }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountList = result.data!.map((a) => PartialAccountOutputDto.fromEntity(a));
            return accountList;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async getBannedList(adminId: string, limit?: number): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    {cmd: 'get_banned_list'},
                    { adminId, limit }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountList = result.data!.map((a) => PartialAccountOutputDto.fromEntity(a));
            return accountList;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async search(adminId: string, contain: string): Promise<PartialAccountOutputDto[]> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                    {cmd: 'search_account'},
                    { adminId, contain }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            const accountList = result.data!.map((a) => PartialAccountOutputDto.fromEntity(a));
            return accountList;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }   
    }

    async getAccountInfo(adminId: string, username: string): Promise<AccountOutputDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_account_info'},
                    { adminId, username }
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
