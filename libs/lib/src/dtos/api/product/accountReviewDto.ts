import { Review } from "../../../entities/SQL/product/reviewEntity";

export class AccountReviewDto{
    title: string;
    brand: string;
    thumbnail?: string;
    rating: number;
    comment?: string;
    created: Date;

    constructor(review: Review){
        this.title = review.product.title;
        this.brand = review.product.brand;
        this.thumbnail = review.product.thumbnail ?? undefined;
        this.rating = review.rating;
        this.comment = review.comment;
        this.created = new Date(review.created);
    };
}