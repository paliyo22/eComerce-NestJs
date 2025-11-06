import { Account } from "libs/entities/users";
import { AddressDto } from "../address/address";
import { StoreDto } from "../store";
import { UserProfileDto } from "./user";
import { AdminProfileDto, BusinessProfileDto, MetaDto } from ".";

export class AccountDto {
    id: string;
    role: string;
    email: string;
    username: string;
    meta: MetaDto;
    userProfile?: UserProfileDto;
    businessProfile?: BusinessProfileDto;
    adminProfile?: AdminProfileDto;
    address?: AddressDto[];
    store?: StoreDto[];

    static fromEntity(account: Account): AccountDto {
            return {
                id: account.id,
                role: account.meta.role.slug,
                email: account.email,
                username: account.username,
                meta: MetaDto.fromEntity(account.meta),
                userProfile: account.userProfile? UserProfileDto.fromEntity(account.userProfile): undefined,
                businessProfile: account.businessProfile? BusinessProfileDto.fromEntity(account.businessProfile): undefined,
                adminProfile: account.adminProfile? AdminProfileDto.fromEntity(account.adminProfile): undefined,
                address: account.addresses.map(address => (AddressDto.fromEntity(address))) || [],
                store: account.stores.map(store => (StoreDto.fromEntity(store))) || []
            };
        }
}