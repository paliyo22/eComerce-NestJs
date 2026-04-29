import { AccountReviewDto, CreateReviewDto, ProductReviewDto, SuccessDto, 
    withRetry } from "@app/lib";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { errorManager } from "../helpers/errorManager";

@Injectable()
export class ReviewService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy
    ) {};

    async getAccountReviews(accountId: string): Promise<AccountReviewDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<AccountReviewDto[]>>(
                    { cmd: 'get_account_reviews' },
                    { accountId }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            throw errorManager(err, 'reviews');
        }
    };  

    async addReview(accountId: string, review: CreateReviewDto): Promise<ProductReviewDto | void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductReviewDto>>(
                    { cmd: 'create_review' },
                    { accountId, review }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            if(result.data){
                return result.data;
            };
        } catch (err) {
            throw errorManager(err, 'reviews');
        }
    }

    async deleteReview (accountId: string, productId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'delete_review' },
                    { accountId, productId }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err) {
            throw errorManager(err, 'reviews');
        }
    }
}