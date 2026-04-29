import { ExactlyOne } from "../../../shared/exactlyOne.decorator";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

@ExactlyOne('cartId', 'cartProductId')
class FromCart {
    constructor(){};

    @IsUUID()
    @IsOptional()
    cartId?: string;

    @IsUUID()
    @IsOptional()
    cartProductId?: string;
};

class FromProduct {
    constructor(){};
    
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}

@ExactlyOne('fromCart', 'fromProduct')
export class CreateDraftOrderDto {
    constructor(){};

    @ValidateNested()
    @Type(() => FromCart)
    @IsOptional()
    fromCart?: FromCart;

    @ValidateNested()
    @Type(() => FromProduct)
    @IsOptional()
    fromProduct?: FromProduct;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsOptional()
    apartment?: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    zip: string;

    @IsString()
    @IsNotEmpty()
    country: string;
}