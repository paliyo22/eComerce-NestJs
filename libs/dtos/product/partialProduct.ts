import { Product } from "libs/entities/products/product.entity";

export class PartialProductDto {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    discountPercentage: number;
    stock: number;
    brand: string;
    tags?: string[];
    images?: string[]; 
    thumbnail?: string;

    static fromEntity(product: Product): PartialProductDto {
        return {
            id: product.id,
            title: product.title,
            description: product.description,
            category: product.category.slug,
            price: product.price,
            discountPercentage: product.discountPercentage,
            stock: product.stock,
            brand: product.brand,
            tags: product.tags? product.tags.map(t => t.title): undefined,
            images: product.images? product.images.map(i => i.link): undefined,
            thumbnail: product.thumbnail || undefined
        };
    }
}