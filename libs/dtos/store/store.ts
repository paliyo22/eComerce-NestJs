import { Store } from "libs/entities/users";
import { AddressDto } from "../address/address";

export class StoreDto {
    address: AddressDto;
    phone: string;

    static fromEntity(store: Store): StoreDto {
        return {
            address: AddressDto.fromEntity(store.address),
            phone: store.phone
        };
    }
}