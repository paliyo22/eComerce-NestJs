import { AtMostOne } from "../../../shared/atMostOne.decorator";
import { Type } from "class-transformer";
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";

class AdminAccount {
    constructor(){};

    @IsString()
    @IsNotEmpty()
    publicName: string;
}

class UserAccount {
    constructor(){};
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    firstname?: string;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    lastname?: string;

    @IsOptional()
    @IsDate()
    @IsNotEmpty()
    birth?: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string
}

class BusinessAccount {
    constructor(){};

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    bio?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string;
}

@AtMostOne('userAccount', 'businessAccount', 'adminAccount')
export class UpdateAccountDto {
    constructor(){};

    @IsOptional()
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email?: string;
    
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    username?: string;

    @ValidateNested()
    @Type(() => AdminAccount)
    @IsOptional()
    adminAccount?: AdminAccount;

    @ValidateNested()
    @Type(() => UserAccount)
    @IsOptional()
    userAccount?: UserAccount;

    @ValidateNested()
    @Type(() => BusinessAccount)
    @IsOptional()
    businessAccount?: BusinessAccount;
}

