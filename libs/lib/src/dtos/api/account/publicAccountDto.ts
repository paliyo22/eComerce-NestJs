import { AccountDto } from "../../events";
import { MetaDto } from "../../events/account/metaDto";
import { PartialProductDto } from "../product";

export class PublicAccountDto {
    username: string;
    accountName: string;
    contactPhone: string;
    bio?: string;
    meta: MetaDto;
    store: {
        address: string;
        city: string;
        country: string;
        phone: string;
    }[];
    products: PartialProductDto[];

    constructor(account: AccountDto, products: PartialProductDto[]) {
        this.accountName = account.businessProfile ? account.businessProfile.title : `${account.userProfile.firstname} ${account.userProfile.lastname}`;
        this.contactPhone = account.businessProfile ? account.businessProfile.phone : account.userProfile.phone;
        this.bio = account.businessProfile ? account.businessProfile.bio : undefined;
        this.meta = account.meta;
        this.store = account.store ? account.store.map((s) => {
            return {
                address: s.address.address,
                city: s.address.city,
                country: s.address.country,
                phone: s.phone
            };
        }) : [];
        this.products = products.length ? products : [];
    };
}