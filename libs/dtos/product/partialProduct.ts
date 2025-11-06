import { Product } from "libs/entities/products/product.entity";

export class PartialProductDto {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    discountPercentage: number;
    stock: boolean;
    brand: string;
    tags?: string[];
    images?: string[]; 
    thumbnail?: string;

    static fromEntity(product: Product): PartialProductDto {
        return {
            id: product.id.toString(),
            title: product.title,
            description: product.description,
            category: product.category?.title || '',
            price: Number(product.price),
            discountPercentage: product.discountPercentage,
            stock: product.stock > 0,
            brand: product.brand,
            tags: product.tags?.map(t => t.title),
            images: product.images?.map(i => i.link),
            thumbnail: product.thumbnail
        };
    }
}