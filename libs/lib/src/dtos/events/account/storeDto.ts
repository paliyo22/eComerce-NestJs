import { Store } from '../../../entities/SQL/account/storeEntity';
import { AddressDto } from './addressDto';

export class StoreDto {
    id: string;
    address: AddressDto;
    phone: string;

    constructor(store: Store){
        this.id = store.id;
        this.address = new AddressDto(store.address);
        this.phone = store.phone;
    };
}