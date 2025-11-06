import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsNotEmpty()
    @IsPositive()
    price: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @IsOptional()
    discountPercentage?: number;

    @IsNumber()
    @IsPositive()
    @IsInt()
    @IsNotEmpty()
    stock: number;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @IsNotEmpty()
    weight: number;

    @IsBoolean()
    @IsNotEmpty()
    physical: boolean;

    @IsString()
    @IsOptional()
    warrantyInformation?: string;

    @IsString()
    @IsOptional()
    shippingInformation?: string;

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

