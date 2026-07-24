import { Body, Controller, Delete, Get, HttpCode, HttpException, Param, 
    ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { StoreService } from "./store.service";
import { badRequest, CreateStoreDto, ERole, StoreDto } from "@app/lib";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import { User } from "../decorators/authGuard.decorator";
import { type JwtPayload } from "../interfaces/JwtPayload";

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
        return this.storeService.getStores(accountId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
    async addStore(
        @User() account: JwtPayload,
        @Body() store: CreateStoreDto
    ): Promise<StoreDto> {
        if(account.role === ERole.User || account.role === ERole.Admin){
            throw new HttpException(badRequest.message, badRequest.code); 
        };
        return this.storeService.addStore(account.accountId, store);
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