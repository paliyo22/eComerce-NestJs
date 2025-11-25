import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateAccountDto } from "./create-acount";


export class CreateUserDto extends CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    firstname: string;
    
    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsOptional()
    @IsDateString()
    birth?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}