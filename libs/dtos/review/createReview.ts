import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateReviewDto{
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsInt()
    @Min(1)
    @Max(10)
    @IsNotEmpty()
    rating: number;
 
    @IsString()
    @IsOptional()
    comment?: string;
}