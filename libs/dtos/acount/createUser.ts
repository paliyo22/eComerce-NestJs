import { IsDate, IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateAccountDto } from "./createAcount";

export class CreateUserDto extends CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    firstname: string;
    
    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsDateString()
    @IsOptional()
    birth?: string;

    @IsString()
    @IsOptional()
    phone?: string;
}