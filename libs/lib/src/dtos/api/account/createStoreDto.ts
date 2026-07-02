import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateAddressDto } from "./createAddressDto";

export class CreateStoreDto extends CreateAddressDto{
    constructor(){super()};

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string;
}