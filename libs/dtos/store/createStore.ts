import { IsNotEmpty, IsString } from "class-validator";
import { CreateAddressDto } from "../address/createAddress";

export class CreateStoreDto extends CreateAddressDto{

    @IsString()
    @IsNotEmpty()
    phone: string;
}