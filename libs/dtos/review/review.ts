import { Review } from "libs/entities/products/review.entity";

export class ReviewDto{
    productId: string;
    userId: string;
    rating: number;
    comment?: string;
    date: string;

    static fromEntity(review: Review): ReviewDto {
        return {
            productId: review.productId,
            userId: review.userId,
            rating: review.rating,
            comment: review.comment,
            date: review.created.toISOString()
        };
    }
}