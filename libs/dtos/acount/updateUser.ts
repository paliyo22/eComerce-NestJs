import { IsDateString, IsOptional, IsString } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateUserDto extends UpdateAccountDto {
    @IsString()
    @IsOptional()
    firstname?: string;
    
    @IsString()
    @IsOptional()
    lastname?: string;

    @IsDateString()
    @IsOptional()
    birth?: string;

    @IsString()
    @IsOptional()
    phone?: string;
}