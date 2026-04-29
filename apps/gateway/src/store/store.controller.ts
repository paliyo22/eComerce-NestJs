import { Body, Controller, Delete, Get, HttpCode, Param, 
    ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { StoreService } from "./store.service";
import { CreateStoreDto, StoreDto } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import { User } from "../decorators/authGuard.decorator";

@Controller('store')
export class StoreController {
    constructor(
        private readonly storeService: StoreService
    ){}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getMyStores(
        @User('accountId') accountId: string
    ): Promise<StoreDto[]> {
        return this.storeService.getStores(accountId, undefined);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
    async addStore(
        @User('accountId') accountId: string,
        @Body() store: CreateStoreDto
    ): Promise<StoreDto> {
        return this.storeService.addStore(accountId, store);
    }

    @Get('/:username')
    async getStores(
        @Param('username') username: string
    ): Promise<StoreDto[]> {
        return this.storeService.getStores(undefined, username);
    }
    
    @Delete('/:storeId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async deleteStore(
        @User('accountId') accountId: string,
        @Param('storeId', ParseUUIDPipe) storeId: string
    ): Promise<void> {
        await this.storeService.deleteStore(accountId, storeId);
    }
}