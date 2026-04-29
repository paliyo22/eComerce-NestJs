import { BadRequestException, Body, Controller, Get, HttpCode, Param, 
    ParseIntPipe, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AccountOutputDto, badRequest, CreateAccountDto, ERole, PartialAccountOutputDto, 
    PartialProductDto, UpdateAccountDto } from "@app/lib";
import { AccountService } from "../account/account.service";
import { User } from "../decorators/authGuard.decorator";
import { Roles } from "../decorators/role.decorator";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";
import { RolesGuard } from "../guards/role.guard";

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ERole.Admin)
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly accountService: AccountService
    ) {};

    //---------------------- ACCOUNT SERVICE -----------------------
    @Get('/account/list')
    async getAccountList(
        @User('accountId') accountId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
    ): Promise<PartialAccountOutputDto[]> {
        return this.adminService.getAccountList(accountId, limit, offset);
    }

    @Get('/account/banned-list')
    async getBannedList(
        @User('accountId') accountId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
    ): Promise<PartialAccountOutputDto[]> {
        return this.adminService.getAccountBannedList(accountId, limit);
    }

    @Get('/account/search')
    async searchAccount(
        @User('accountId') accountId: string,
        @Query('contain') contain: string
    ): Promise<PartialAccountOutputDto[]> {
        return this.adminService.searchAccount(accountId, contain);
    }

    @Put()
    async updateAdmin(
        @User('accountId') accountId: string,
        @Body() account: UpdateAccountDto
    ): Promise<AccountOutputDto | void> {
        if(account.businessAccount || account.userAccount){
            throw new BadRequestException(badRequest.message);
        }
        return this.accountService.updateAccount(accountId, account);
    };

    @Post()
    @HttpCode(204)
    async addAdmin(
        @User('accountId') accountId: string,
        @Body() account: CreateAccountDto
    ): Promise<void> {
        if(!account.adminAccount){
            throw new BadRequestException(badRequest.message);
        }
        await this.adminService.addAdmin(accountId, account);
    }

    //---------------------- Account /: ---------------------------
    @Post('/account/ban/:mail')
    @HttpCode(204)
    async banAccount(
        @User('accountId') accountId: string,
        @Param('mail') mail: string
    ): Promise<void> {
        await this.adminService.banAccount(accountId, mail);
    }

    @Post('/account/unban/:mail')
    @HttpCode(204)
    async unbanAccount(
        @User('accountId') accountId: string,
        @Param('mail') mail: string
    ): Promise<void> {
        await this.adminService.unbanAccount(accountId, mail);
    }

    @Post('/account/suspend/:mail')
    @HttpCode(204)
    async suspendAccount(
        @User('accountId') accountId: string,
        @Param('mail') mail: string
    ): Promise<void> {
        await this.adminService.suspendAccount(accountId, mail);
    }

    @Post('/account/search-account/:username')
    async getAccountInfo(
        @Body() password: string,
        @Param('username') username: string
    ): Promise<AccountOutputDto> {
        return this.adminService.getAccountInfo(password, username);
    }

    //---------------------- PRODUCT SERVICE -----------------------
    @Post('/calculate-rating')
    @HttpCode(202)
    async calculateRating(): Promise<void> {
        return this.adminService.calculateRating();
    }

    @Get('/product/banned-list')
    async getBannedProductList(
        @User('accountId') accountId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
    ): Promise<PartialProductDto[]> {
        return this.adminService.getBannedProducts(accountId, limit, offset);
    }

    //---------------------- Product /: ---------------------------
    @Post('/product/ban/:id')
    @HttpCode(204)
    async banProduct(
        @User('accountId') accountId: string,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<void> {
        await this.adminService.banProduct(accountId, id);
    }

    @Post('/product/unban/:id')
    @HttpCode(204)
    async unbanProduct(
        @User('accountId') accountId: string,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<void> {
        await this.adminService.unbanProduct(accountId, id);
    }
}