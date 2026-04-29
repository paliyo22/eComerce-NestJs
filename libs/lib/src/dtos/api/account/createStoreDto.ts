import { IsNotEmpty, IsString } from "class-validator";
import { CreateAddressDto } from "./createAddressDto";

export class CreateStoreDto extends CreateAddressDto{
    constructor(){super()};

    @IsString()
    @IsNotEmpty()
    phone: string;
}