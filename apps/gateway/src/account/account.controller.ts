import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query, Req, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { AccountService } from './account.service';
import type { Response } from 'express';
import { CreateAdminDto, CreateBusinessDto, CreateUserDto, UpdateBusinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountOutputDto, PartialAccountOutputDto } from './acount-dto';
import { UpdateAdminDto } from 'libs/dtos/acount/update-admin';
import { AuthDto } from '../auth/auth-dto';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';
import { RolesGuard } from '../guards/role.guard';
import { Roles } from '../decorators/role.decorator';
import { ERole } from 'libs/shared/role-enum';

@Controller('account')
export class AccountController {
    constructor(private readonly accountService: AccountService){}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getInfo(@Req() req): Promise<AccountOutputDto> {
        return this.accountService.getInfo(req.user.userId);
    }

    @Post()
    async addAccount(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: CreateUserDto | CreateAdminDto | CreateBusinessDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto> {
        const { partialAccount, jwtAccess } = await this.accountService.addAccount(account);
        res.cookie('accessToken', jwtAccess, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60
        });
        res.cookie('refreshToken', partialAccount.refreshToken!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24
        });
        return AuthDto.fromEntity(partialAccount);
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    async updateAccount(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: UpdateAdminDto | UpdateBusinessDto | UpdateUserDto,
        @Req() req
    ): Promise<AccountOutputDto> {
        return this.accountService.updateAccount(req.user.userId, account, req.user.role);
    }

    @Post('/address')
    @UseGuards(JwtAuthGuard)
    async addAddress(
        @Body('address', new ValidationPipe({whitelist: true, transform: true})) address: CreateAddressDto,
        @Req() req
    ): Promise<AddressDto[]> {
        return this.accountService.addAddress(req.user.userId, address);
    }

    @Post('/store')
    @UseGuards(JwtAuthGuard)
    async addStore(
        @Body('store', new ValidationPipe({whitelist: true, transform: true})) store: CreateStoreDto,
        @Req() req
    ): Promise<StoreDto[]> {
        return this.accountService.addStore(req.user.userId, store);
    }

    @Post('/delete')
    @UseGuards(JwtAuthGuard)
    async deleteAccount(
        @Body('password') password: string,
        @Req() req
    ): Promise<string> {
        return this.accountService.deleteAccount(req.user.userId, password);
    }

    @Get('/admin/list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ERole.Admin)
    async getAccountList(
        @Req() req,
        @Query('limit', ParseIntPipe) limit?: number, 
        @Query('offset', ParseIntPipe) offset?: number
    ): Promise<PartialAccountOutputDto[]> {
        return this.accountService.getAccountList(req.user.userId, limit, offset);
    }

    @Get('/admin/banned-list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ERole.Admin)
    async getBannedList(
        @Req() req,
        @Query('limit', ParseIntPipe) limit?: number
    ): Promise<PartialAccountOutputDto[]> {
        return this.accountService.getBannedList(req.user.userId, limit);
    }


    @Post('/admin/ban-status/:username')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ERole.Admin)
    async changeBannedStatust(
        @Param('username') username: string,
        @Req() req
    ): Promise<string> {
        return this.accountService.changeBannedStatust(req.user.userId, username);
    }

    @Delete('/address/:addressId')
    @UseGuards(JwtAuthGuard)
    async deleteAddress(
        @Param('addressId', new ParseUUIDPipe()) addressId: string,
        @Req() req
    ): Promise<string> {
        return this.accountService.deleteAddress(req.user.userId, addressId);
    }

    @Delete('/store/:storeId')
    @UseGuards(JwtAuthGuard)
    async deleteStore(
        @Param('storeId', new ParseUUIDPipe()) storeId: string,
        @Req() req
    ): Promise<string> {
        return this.accountService.deleteStore(req.user.userId, storeId);
    }

    // NO IMPLEMENTADAS EN EL FRONT 

    @Get('/admin/search')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ERole.Admin)
    async search(
        @Req() req,
        @Query('contain') contain: string
    ): Promise<PartialAccountOutputDto[]> {
        return this.accountService.search(req.user.userId, contain);
    }

    @Get('/admin/:username')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ERole.Admin)
    async getAccountInfo(
        @Req() req,
        @Param('username') username: string
    ): Promise<AccountOutputDto> {
        return this.accountService.getAccountInfo(req.user.userId, username);
    }
}
