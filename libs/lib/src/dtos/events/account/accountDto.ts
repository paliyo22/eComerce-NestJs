import { Account } from "../../../entities/SQL/account/accountEntity";
import { AddressDto } from "./addressDto";
import { AdminProfileDto } from "./adminDto";
import { BusinessProfileDto } from "./businessDto";
import { MetaDto } from "./metaDto";
import { PartialAccountDto } from "./partialAccountDto";
import { StoreDto } from "./storeDto";
import { UserProfileDto } from "./userDto";


export class AccountDto extends PartialAccountDto{
    meta: MetaDto;
    userProfile?: UserProfileDto;
    businessProfile?: BusinessProfileDto;
    adminProfile?: AdminProfileDto;
    address?: AddressDto[];
    store?: StoreDto[];
    
    constructor(account: Account){
        super(account);
        this.meta = new MetaDto(account.meta);
        this.userProfile = account.userProfile? new UserProfileDto(account.userProfile): undefined;
        this.businessProfile = account.businessProfile? new BusinessProfileDto(account.businessProfile): undefined;
        this.adminProfile = account.adminProfile? new AdminProfileDto(account.adminProfile): undefined;
        this.address = account.addresses?.map(address => (new AddressDto(address)));
        this.store = account.stores?.map(store => (new StoreDto(store)));
    }
}