import { Address } from '../../../entities/SQL/account/addressEntity';

export class AddressDto {
    id: string;
    address: string;
    apartment?: string;
    city: string;
    zip: string;
    country: string;   

    constructor(address: Address){
        this.id = address.id;
        this.address = address.address;
        this.apartment = address.apartment ?? undefined;
        this.city = address.city;
        this.zip = address.zip;
        this.country = address.country;
    };
}