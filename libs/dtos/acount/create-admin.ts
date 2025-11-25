import { IsString, IsNotEmpty } from "class-validator";
import { CreateAccountDto } from "./create-acount";

export class CreateAdminDto extends CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    publicName: string;
}