import { Review } from "apps/product/src/entities/review.entity";
import { PartialAccountDto } from "../acount";

export class ReviewDto{
  productId: string;
  accountId: string;
  rating: number;
  comment: string;
  date: Date;

  static fromEntity(review: Review): ReviewDto {
      return {
          productId: review.productId,
          accountId: review.userId,
          rating: review.rating,
          comment: review.comment ?? '',
          date: review.created
      };
  }

  static loadArray(review: ReviewDto[], account: PartialAccountDto[]): ReviewDto[] {
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
