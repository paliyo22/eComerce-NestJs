import { ReviewService } from "./review.service";
import { Body, Controller, Delete, Get, HttpCode, Param, 
    ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AccountReviewDto, CreateReviewDto, ERole, ProductReviewDto } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import { User } from "../decorators/authGuard.decorator";
import { RolesGuard } from "../guards/role.guard";
import { Roles } from "../decorators/role.decorator";

@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
    constructor(
        private readonly reviewService: ReviewService
    ){}

    @Get()
    async getAccountReviews(
        @User('accountId') accountId: string
    ): Promise<AccountReviewDto[]>{
        return this.reviewService.getAccountReviews(accountId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(ERole.User, ERole.Seller)
    @HttpCode(201)
    async addReview (
        @Body() review: CreateReviewDto,
        @User('accountId') accountId: string
    ): Promise<ProductReviewDto | void> {
        return this.reviewService.addReview(accountId, review);
    }

    @Delete('/:productId')
    @HttpCode(204)
    async deleteReview (
        @Param('productId', ParseUUIDPipe) productId: string,
        @User('accountId') accountId: string
    ): Promise<void> {
        await this.reviewService.deleteReview(accountId, productId);
    }
}