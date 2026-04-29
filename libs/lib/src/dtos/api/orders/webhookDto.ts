import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsString, ValidateNested } from "class-validator";

class WebhookDataDto {
    constructor(){};
    
    @IsString()
    @IsNotEmpty()
    id: string;
}

export class WebhookDto {
    constructor(){};

    @IsString()
    @IsNotEmpty()
    action: string;

    @IsString()
    @IsNotEmpty()
    api_version: string;

    @ValidateNested()
    @Type(() => WebhookDataDto)
    @IsNotEmpty()
    data: WebhookDataDto;

    @IsString()
    @IsNotEmpty()
    date_created: string;

    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsBoolean()
    @IsNotEmpty()
    live_mode: boolean;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsNumber()
    @IsNotEmpty()
    user_id: number;
}