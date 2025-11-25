import { Account } from "apps/account/src/entities";
import { AddressDto } from "../address/address";
import { StoreDto } from "../store";
import { UserProfileDto } from "./user";
import { AdminProfileDto, BusinessProfileDto, MetaDto } from ".";
import { ERole } from "libs/shared/role-enum";
import { PartialAccountDto } from "./partial-account";

export class AccountDto extends PartialAccountDto{
    meta: MetaDto;
    userProfile?: UserProfileDto;
    businessProfile?: BusinessProfileDto;
    adminProfile?: AdminProfileDto;
    address?: AddressDto[];
    store?: StoreDto[];

    static fromEntity(account: Account): AccountDto {
        return {
            id: account.id,
            email: account.email,
            username: account.username,
            meta: MetaDto.fromEntity(account.meta),
            role: account.meta.role.slug as ERole,
            status: account.meta.status.name,
            userProfile: account.userProfile? UserProfileDto.fromEntity(account.userProfile): undefined,
            businessProfile: account.businessProfile? BusinessProfileDto.fromEntity(account.businessProfile): undefined,
            adminProfile: account.adminProfile? AdminProfileDto.fromEntity(account.adminProfile): undefined,
            address: account.addresses?.map(address => (AddressDto.fromEntity(address))) ?? [],
            store: account.stores?.map(store => (StoreDto.fromEntity(store))) ?? []
        };
    }
}