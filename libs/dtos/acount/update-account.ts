import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateAccountDto {
    @IsOptional()
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email?: string;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    username?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    password?: string;
}