import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./createUser";

export class UpdateUserDto extends PartialType(CreateUserDto) {
}