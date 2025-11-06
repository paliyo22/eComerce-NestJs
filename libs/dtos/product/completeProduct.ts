import { ProductDto } from "./product";
import { UserDto } from "../acount/user";

export class CompleteProductDto extends ProductDto{
    accountName: string;
    contactPhone: string;
    contactEmail: string;
    accountBio?: string;
    store?: {
        address: string,
        city: string,
        country: string,
        phone: string
    }[];

    static fromEntities(product: ProductDto, user: UserDto, reviewUsers: UserDto[]): CompleteProductDto {
        // Crear map de userId -> username para las reviews
        const usernameMap = new Map(reviewUsers.map(u => [u.id, u.username]));

        // Mapear reviews con username
        const reviewsWithUsername = product.reviews?.map(r => ({
            ...r,
            username: usernameMap.get(r.userId) || 'Desconocido'
        })) || [];

        return {
            ...product,
            accountName: user.username,
            contactPhone: user.phone,
            contactEmail: user.email,
            accountBio: user.bio,
            store: user.store?.map(s => ({
                address: s.address.address,
                city: s.address.city,
                country: s.address.country,
                phone: s.phone
            })),
            reviews: reviewsWithUsername
        };
    }
}