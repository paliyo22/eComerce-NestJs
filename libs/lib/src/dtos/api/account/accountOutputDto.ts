import { Account } from "../../../entities/SQL/account/accountEntity";
import { AddressDto } from "../../events/account/addressDto";
import { AdminProfileDto } from "../../events/account/adminDto";
import { BusinessProfileDto } from "../../events/account/businessDto";
import { MetaDto } from "../../events/account/metaDto";
import { StoreDto } from "../../events/account/storeDto";
import { UserProfileDto } from "../../events/account/userDto";
import { PartialAccountOutputDto } from "./partialAccountOutputDto";


export class AccountOutputDto extends PartialAccountOutputDto {
    meta: MetaDto;
    userProfile?: UserProfileDto;
    businessProfile?: BusinessProfileDto;
    adminProfile?: AdminProfileDto;
    address?: AddressDto[];
    store?: StoreDto[];

    constructor(account: Account){
        super(account);
        this.meta = new MetaDto(account.meta);
        this.userProfile = account.userProfile ? new UserProfileDto(account.userProfile) : undefined;
        this.businessProfile = account.businessProfile ? new BusinessProfileDto(account.businessProfile) : undefined;
        this.adminProfile = account.adminProfile ? new AdminProfileDto(account.adminProfile) : undefined;
        this.address = account.addresses ? account.addresses.map((a) => new AddressDto(a)) : undefined;
        this.store = account.stores ? account.stores.map((s) => new StoreDto(s)) : undefined;
    };
}

