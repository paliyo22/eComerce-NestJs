import { Address, AddressDto, CreateAddressDto, errorMessage, notFound, SuccessDto, uuidTransformer } from "@app/lib";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class AddressService {
    constructor(
        @InjectRepository(Address)
        private readonly addressRepository: Repository<Address>,
    ){};
    
    async getAddress(accountId: string): Promise<SuccessDto<AddressDto[]>>{
        try {
            const addresses = await this.addressRepository
                .createQueryBuilder('a')
                .where('a.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .getMany();

            if(!addresses.length){
                return {
                    success: true,
                    data: []
                };
            };

            const data = addresses.map((a) => new AddressDto(a));

            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(AddressService.name, err);
        }
    };
    
    async addAddress(accountId: string, dto: CreateAddressDto): Promise<SuccessDto<AddressDto>> {
        try {
            const address = this.addressRepository.create({
                accountId: accountId,
                address: dto.address,
                apartment: dto.apartment ?? null,
                city: dto.city,
                zip: dto.zip,
                country: dto.country
            });

            const result = await this.addressRepository.save(address);

            return { success: true, data: new AddressDto(result) };
        } catch (err: any) {
            return errorMessage(AddressService.name, err);
        }
    };

    async deleteAddress(accountId: string, addressId: string): Promise<SuccessDto<void>> {
        try {
            const result = await this.addressRepository
                .createQueryBuilder()
                .delete()
                .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .andWhere('id = :id', { id: uuidTransformer.to(addressId) })
                .execute();

            if (!result.affected) {
                return notFound
            };

            return { 
                success: true
            };
        } catch (err: any) {
            return errorMessage(AddressService.name, err);
        }
    };
}