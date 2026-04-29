import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    constructor(){};

    @IsString()
    @IsNotEmpty()
    account: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}