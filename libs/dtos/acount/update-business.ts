import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateBusinessDto extends UpdateAccountDto{
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string;

    @IsOptional()
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    contactEmail?: string;
}