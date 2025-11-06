import { BusinessProfile } from "libs/entities/users";

export class BusinessProfileDto {
    title: string;
    bio: string | null;
    phone: string;
    contactEmail: string;

    static fromEntity(business: BusinessProfile): BusinessProfileDto {
        return {
            title: business.title,
            bio: business.bio,
            phone: business.phone,
            contactEmail: business.contactEmail
        };
    }
}