import { BusinessProfile } from '../../../entities/SQL/account/businessEntity';

export class BusinessProfileDto {
    title: string;
    bio?: string;
    phone: string;
    cbu: string;

    constructor(business: BusinessProfile){
        this.title = business.title;
        this.bio = business.bio ?? undefined;
        this.phone = business.phone;
        this.cbu = business.cbu;
    };
}