import { IsString, IsNotEmpty } from "class-validator";
import { CreateAccountDto } from "./createAcount";

export class CreateAdminDto extends CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    publicName: string;
}