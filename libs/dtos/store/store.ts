import { Store } from "apps/account/src/entities";
import { AddressDto } from "../address/address";

export class StoreDto {
    id: string;
    address: AddressDto;
    phone: string;

    static fromEntity(store: Store): StoreDto {
        return {
            id: store.id,
            address: AddressDto.fromEntity(store.address),
            phone: store.phone
        };
    }
}