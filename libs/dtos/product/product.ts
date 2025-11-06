import { Product } from "libs/entities/products/product.entity";
import { ReviewDto } from "../review";
import { PartialProductDto } from "./partialProduct";

export class ProductDto extends PartialProductDto{
    reviews?: ReviewDto[];
    meta: {
        created: string,
        updated: string
    };
    weight: number;
    warrantyInformation?: string;
    shippingInformation?: string;   
    physical: boolean;

    static fromEntity(product: Product): ProductDto {
        return {
            ...PartialProductDto.fromEntity(product),
            reviews: product.reviews?.map(r => ReviewDto.fromEntity(r)),
            meta: {
                created: product.meta?.created?.toISOString() || '',
                updated: product.meta?.updated?.toISOString() || ''
            },
            weight: product.weight,
            warrantyInformation: product.warrantyInfo,
            shippingInformation: product.shippingInfo,
            physical: product.physical
        };
    }
}