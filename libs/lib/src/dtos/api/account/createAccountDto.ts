import { ExactlyOne } from "../../../shared/exactlyOne.decorator";
import { Type } from "class-transformer";
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";

class AdminAccount{
    @IsString()
    @IsNotEmpty()
    publicName: string;
}

class BusinessAccount{
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsString()
    @IsNotEmpty()
    phone: string; 
}

class UserAccount{
    @IsString()
    @IsNotEmpty()
    firstname: string;
    
    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsOptional()
    @IsDate()
    birth?: Date;

    @IsOptional()
    @IsString()
    phone?: string;
}

@ExactlyOne('userAccount', 'businessAccount', 'adminAccount')
export class CreateAccountDto {
    
    constructor(){}
    
    @IsEmail()
    @MaxLength(100)
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(3)
    @MaxLength(50)
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @ValidateNested()
    @Type(() => BusinessAccount)
    @IsOptional()
    businessAccount?: BusinessAccount;

    @ValidateNested()
    @Type(() => UserAccount)
    @IsOptional()
    userAccount?: UserAccount;

    @ValidateNested()
    @Type(() => AdminAccount)
    @IsOptional()
    adminAccount?: AdminAccount;
}