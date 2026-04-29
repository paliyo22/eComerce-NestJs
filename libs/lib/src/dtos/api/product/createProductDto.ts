import { EProductCategory } from "../../../enums/EProductCategory";
import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    category: EProductCategory;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsNotEmpty()
    @Min(0)
    price: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    discountPercentage?: number;

    @IsNumber()
    @Min(0)
    @IsInt()
    @IsNotEmpty()
    stock: number;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsNotEmpty()
    weight: number;

    @IsBoolean()
    @IsNotEmpty()
    physical: boolean;

    @IsString()
    @IsOptional()
    warrantyInfo?: string;

    @IsString()
    @IsOptional()
    shippingInfo?: string;

    @IsArray()
    @IsOptional()
    @ArrayNotEmpty()
    tags?: string[];

    @IsArray()
    @IsOptional()
    @ArrayNotEmpty()
    images?: string[]; 

    @IsString()
    @IsOptional()
    thumbnail?: string;
}

