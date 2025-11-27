import { PartialProductDto } from "../product";
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class AddProductToCartDto {
    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsNumber()
    price: number;

    @IsNotEmpty()
    @IsInt()
    amount: number;
}