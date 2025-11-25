import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateUserDto extends UpdateAccountDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    firstname?: string;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    lastname?: string;

    @IsOptional()
    @IsDateString()
    birth?: string;

    @IsOptional()
    @IsString()
    phone?: string | null;
}