import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateAccountDto } from "./createAcount";

export class CreateBussinessDto extends CreateAccountDto{
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    @IsOptional()
    contactEmail?: string;
}