import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateAdminDto extends UpdateAccountDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    publicName?: string;
}