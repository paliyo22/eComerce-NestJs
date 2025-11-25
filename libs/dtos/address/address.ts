import { Address } from "apps/account/src/entities";

export class AddressDto {
    id: string;
    address: string;
    apartment?: string;
    city: string;
    zip: string;
    country: string;   

    static fromEntity(address: Address): AddressDto {
        return {
            id: address.id,
            address: address.address,
            apartment: address.apartment || undefined,
            city: address.city,
            zip: address.zip,
            country: address.country
        };
    }
}