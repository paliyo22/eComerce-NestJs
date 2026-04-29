import { IsInt, IsNotEmpty, IsUUID, Min } from "class-validator";

export class AddProductToCartDto {
    
    constructor(){};

    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    amount: number;
}