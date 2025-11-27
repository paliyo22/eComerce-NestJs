import { Product } from "apps/product/src/entities/product.entity";
import { ReviewDto } from "../review";
import { PartialProductDto } from "./partialProduct";

export class ProductDto extends PartialProductDto{
    userId: string;
    reviews?: ReviewDto[];
    meta: {
        created: Date,
        updated: Date
    };
    weight: number;
    warrantyInformation?: string;
    shippingInformation?: string;   
    physical: boolean;

    static fromEntity(product: Product): ProductDto {
        return {
            ...PartialProductDto.fromEntity(product),
            userId: product.userId,
            reviews: product.reviews? product.reviews.map(r => ReviewDto.fromEntity(r)): undefined,
            meta: {
                created: product.meta.created,
                updated: product.meta.updated
            },
            weight: product.weight,
            warrantyInformation: product.warrantyInfo ?? undefined,
            shippingInformation: product.shippingInfo ?? undefined,
            physical: product.physical
        };
    }
}