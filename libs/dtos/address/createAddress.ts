import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateAddressDto {
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