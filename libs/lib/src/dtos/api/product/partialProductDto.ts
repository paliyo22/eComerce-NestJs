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
    brand: string;
    ratingAvg: number;
    tags?: string[];
    images?: string[]; 
    thumbnail?: string;
    status: EProductStatus;

    constructor(product: Product){
        this.id = product.id;
        this.title = product.title;
        this.description = product.description;
        this.category = product.category.slug;
        this.price = product.price;
        this.discountPercentage = product.discountPercentage;
        this.stock = product.stock;
        this.brand = product.brand;
        this.ratingAvg = product.ratingAvg;
        this.tags = product.tags? product.tags.map(t => t.title): undefined;
        this.images = product.images? product.images.map(i => i.link): undefined;
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