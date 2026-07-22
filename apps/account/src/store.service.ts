import { Account, Address, badRequest, banned, CreateStoreDto, EAccountStatus, errorMessage, notFound, Store, StoreDto, SuccessDto, uuidTransformer } from "@app/lib";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneralService } from "./general.service";

@Injectable()
export class StoreService {
    constructor(
        private readonly generalService: GeneralService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
    ){};

    async getStores(accountId?: string, username?: string): Promise<SuccessDto<StoreDto[]>> {
        try {
            const qb = this.accountRepository
                .createQueryBuilder('a')
                .innerJoinAndSelect('a.meta', 'm')
                .leftJoinAndSelect('m.status', 'st')
                .leftJoinAndSelect('a.stores', 's')
                .leftJoinAndSelect('s.address', 'sa');

            if(!accountId && !username){
                return badRequest;
            }else{
                if(accountId){
                    qb.where('a.id = :accountId', { accountId: uuidTransformer.to(accountId) });
                }else{
                    qb.where('a.username = :username', {username});
                };
            };
            const result = await qb.getOne();

            if(!result){
                return notFound;
            }

            if(result.meta.status.slug === EAccountStatus.Banned){
                return banned;
            }

            const data: StoreDto[] = []; 
            result.stores.forEach((s) => { data.push(new StoreDto(s)) });
            return {
                success: true,
                data
            }      
        } catch (err: any) {
            return errorMessage(StoreService.name, err);
        }
    } 
      
    async addStore(accountId: string, dto: CreateStoreDto): Promise<SuccessDto<StoreDto>> {
        try {
            const account = await this.generalService.getAccount(accountId);
            if(!account.success){
                return {
                    success: false,
                    code: account.code,
                    message: account.message
                };
            };

            const phone = account.data!.businessProfile ? account.data!.businessProfile.phone : account.data!.userProfile.phone;
            const result = await this.storeRepository.manager.transaction(async manager => {
                const newStore = manager.create(Store, {
                    accountId: accountId,
                    phone: dto.phone ?? phone
                });
                const store = await manager.save(newStore);

                const newAddress = manager.create(Address, {
                    storeId: store.id,
                    address: dto.address,
                    apartment: dto.apartment ?? null,
                    city: dto.city,
                    zip: dto.zip,
                    country: dto.country
                });
                const address = await manager.save(newAddress);

                store.address = address;

                return store;
            }); 

            return { 
                success: true, 
                data: new StoreDto(result)
            };
        } catch (err: any) {
            return errorMessage(StoreService.name, err);
        }
    }
    
    async deleteStore(accountId: string, storeId: string): Promise<SuccessDto<void>> {
        try {
            const result = await this.storeRepository
                .createQueryBuilder()
                .delete()
                .where('id = :storeId', { storeId: uuidTransformer.to(storeId) })
                .andWhere('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .execute();
                
            if (!result.affected) {
                return notFound;
            };
            
            return { 
                success: true 
            };
        } catch (err: any) {
            return errorMessage(StoreService.name, err);
        }
    }
}