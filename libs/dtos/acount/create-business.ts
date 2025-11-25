import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateAccountDto } from "./create-acount";


export class CreateBusinessDto extends CreateAccountDto{
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;
}