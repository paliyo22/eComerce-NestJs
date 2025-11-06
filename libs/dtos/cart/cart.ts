import { PartialProductDto } from "../product/partialProduct";

export class CartDto {
    id: string;
    product: PartialProductDto[]
}