import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from "./createProduct";
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @IsString()
    @IsNotEmpty()
    id: string;
}