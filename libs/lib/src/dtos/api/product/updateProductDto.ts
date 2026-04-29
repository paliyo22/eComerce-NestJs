import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from ".";

export class UpdateProductDto extends PartialType(CreateProductDto) {
}