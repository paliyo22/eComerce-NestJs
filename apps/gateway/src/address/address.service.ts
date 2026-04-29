import { CreateAddressDto, AddressDto, SuccessDto, withRetry } from "@app/lib";
import { Injectable, Inject, HttpException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { errorManager } from "../helpers/errorManager";

@Injectable()
export class AddressService {
    constructor (
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
    ) {};

    async getAddresses(accountId: string): Promise<AddressDto[]>{
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AddressDto[]>>(
                    {cmd: 'get_addresses'},
                    { accountId }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'address');
        }   
    }

    async addAddress(accountId: string, address: CreateAddressDto): Promise<AddressDto> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<AddressDto>>(
                    {cmd: 'add_address'},
                    { accountId, address }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'address');
        }   
    }

    async deleteAddress(accountId: string, addressId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.accountClient.send<SuccessDto<void>>(
                    {cmd: 'delete_address'},
                    { accountId, addressId }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, 'address');
        }   
    }
}