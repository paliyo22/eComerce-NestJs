import { Body, Controller, Delete, Get, HttpCode, Param, 
    ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AddressService } from "./address.service";
import { AddressDto, CreateAddressDto } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import { User } from "../decorators/authGuard.decorator";

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
    constructor(
        private readonly addressService: AddressService
    ){};

    @Get()
    async getAddresses(
        @User('accountId') accountId: string
    ): Promise<AddressDto[]> {
        return this.addressService.getAddresses(accountId);
    }

    @Post()
    @HttpCode(201)
    async addAddress(
        @User('accountId') accountId: string,
        @Body() address: CreateAddressDto
    ): Promise<AddressDto> {
        return this.addressService.addAddress(accountId, address);
    }

    @Delete('/:addressId')
    @HttpCode(204)
    async deleteAddress(
        @User('accountId') accountId: string,
        @Param('addressId', ParseUUIDPipe) addressId: string
    ): Promise<void> {
        await this.addressService.deleteAddress(accountId, addressId);
    }
}