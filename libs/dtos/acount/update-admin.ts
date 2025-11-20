import { IsOptional, IsString } from "class-validator";
import { UpdateAccountDto } from "./update-account";

export class UpdateAdminDto extends UpdateAccountDto {
    @IsString()
    @IsOptional()
    publicName?: string;
}