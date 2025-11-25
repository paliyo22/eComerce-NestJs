import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ERole } from "libs/shared/role-enum";


export class CreateAccountDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    role: ERole;
}