import { Product } from "../../../entities/SQL/product/productEntity";
import { EProductStatus } from "../../../enums/EProductStatus";

export class PartialProductDto {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    discountPercentage: number;
    stock: number;
    brand?: string;
    ratingAvg: number;
    tags: string[];
    images?: string[]; 
    thumbnail?: string;
    status: EProductStatus;

    constructor(product: Product){
        this.id = product.id;
        this.title = product.title;
        this.description = product.description;
        this.category = product.category.slug;
        this.price = Number(product.price);
        this.discountPercentage = Number(product.discountPercentage);
        this.stock = Number(product.stock);
        this.brand = product.brand ?? undefined;
        this.ratingAvg = Number(product.ratingAvg);
        this.tags = product.tags ? product.tags.map(t => t.title) : [];
        this.images = product.images ? product.images.map(i => i.link) : [];
        this.thumbnail = product.thumbnail ?? undefined;
        if(product.meta.deletedBy){
            if(product.meta.deletedBy === product.meta.accountId){
                this.status = EProductStatus.DELETED;
            }else{
                this.status = EProductStatus.BANNED;
            };
        }else{
            if(product.stock > 0){
                this.status = EProductStatus.ACTIVE;
            }else{
                this.status = EProductStatus.UNAVAILABLE;
            }
        }
    };
}