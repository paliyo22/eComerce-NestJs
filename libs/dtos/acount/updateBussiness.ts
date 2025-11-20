import { IsEmail, IsOptional, IsString } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateBussinessDto extends UpdateAccountDto{
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEmail()
    @IsString()
    @IsOptional()
    contactEmail?: string;
}