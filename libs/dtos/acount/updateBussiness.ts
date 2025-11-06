import { PartialType } from "@nestjs/mapped-types";
import { CreateBussinessDto } from "./createBussiness";

export class UpdateBussinessDto extends PartialType(CreateBussinessDto) {
}