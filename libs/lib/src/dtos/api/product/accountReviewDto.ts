import { Review } from "../../../entities/SQL/product/reviewEntity";

export class AccountReviewDto{
    productId: string;
    title: string;
    brand?: string;
    thumbnail?: string;
    rating: number;
    comment?: string;
    created: Date;

    constructor(review: Review){
        this.productId = review.productId;
        this.title = review.product.title;
        this.brand = review.product.brand ?? undefined;
        this.thumbnail = review.product.thumbnail ?? undefined;
        this.rating = Number(review.rating);
        this.comment = review.comment ?? undefined;
        this.created = new Date(review.created);
    };
}