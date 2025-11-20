import { Review } from "libs/entities/products/review.entity";
import { AccountDto } from "../acount";

export class ReviewDto{
    productId: string;
    accountId: string;
    rating: number;
    comment: string | null;
    date: Date;

    static fromEntity(review: Review): ReviewDto {
        return {
            productId: review.productId,
            accountId: review.userId,
            rating: review.rating,
            comment: review.comment ?? null,
            date: review.created
        };
    }

    static loadArray(review: ReviewDto[], account: AccountDto[]): ReviewDto[] {
        const reviewList = review.map((r) => {
          const user = account.find((u) => u.id === r.accountId);
          const { accountId, ...rest } = r;
          return {
            ...rest,
            username: user ? user.username : "unknown",
          };
        }) as any;
        
        return reviewList;
    }
}
