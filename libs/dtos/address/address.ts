import { Address } from "libs/entities/users";

export class AddressDto {
    address: string;
    apartment: string;
    city: string;
    zip: string;
    country: string;   

    static fromEntity(address: Address): AddressDto {
        return {
            address: address.address,
            apartment: address.apartment,
            city: address.city,
            zip: address.zip,
            country: address.country
        };
    }
}