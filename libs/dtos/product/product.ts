import { Product } from "libs/entities/products/product.entity";
import { ReviewDto } from "../review";
import { PartialProductDto } from "./partialProduct";

export class ProductDto extends PartialProductDto{
    reviews?: ReviewDto[];
    meta: {
        created: Date,
        updated: Date
    };
    weight: number;
    warrantyInformation: string | null;
    shippingInformation: string | null;   
    physical: boolean;

    static fromEntity(product: Product): ProductDto {
        return {
            ...PartialProductDto.fromEntity(product),
            reviews: product.reviews? product.reviews.map(r => ReviewDto.fromEntity(r)): undefined,
            meta: {
                created: product.meta.created,
                updated: product.meta.updated
            },
            weight: product.weight,
            warrantyInformation: product.warrantyInfo ?? null,
            shippingInformation: product.shippingInfo ?? null,
            physical: product.physical
        };
    }
}