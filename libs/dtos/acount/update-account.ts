import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateAccountDto {
    @IsEmail()
    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    password?: string;
}