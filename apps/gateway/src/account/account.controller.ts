import { Body, Controller, Get, Post, Put, Req, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { AccountService } from './account.service';
import type { Response } from 'express';
import { ERole, getRoleGroup } from 'libs/shared/role-enum';
import { CreateBussinessDto, CreateUserDto, UpdateBussinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { CreateAdminDto } from 'libs/dtos/acount/createAdmin';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountOutputDto } from './acount-dto';
import { UpdateAdminDto } from 'libs/dtos/acount/update-admin';

@Controller('account')
export class AccountController {
    constructor(private readonly accountService: AccountService){}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getInfo(@Req() req): Promise<AccountOutputDto> {
        return this.accountService.getInfo(req.user.userId);
    }

    @Post('/user')
    async addUser(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: CreateUserDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<{username: string, role: ERole}> {
        const { partialAccount, jwtAccess } = await this.accountService.addUser(account);
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
        return {
            username: partialAccount.username,
            role: partialAccount.role,
        };
    }

    @Post('/business')
    async addBusiness(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: CreateBussinessDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<{username: string, role: ERole}> {
        const { partialAccount, jwtAccess } = await this.accountService.addBusiness(account);
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
        return {
            username: partialAccount.username,
            role: partialAccount.role,
        };
    }

    @Post('/admin')
    async addAdmin(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: CreateAdminDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<{username: string, role: ERole}> {
        const { partialAccount, jwtAccess } = await this.accountService.addAdmin(account);
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
        return {
            username: partialAccount.username,
            role: partialAccount.role,
        };
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    async updateAccount(
        @Body('account', new ValidationPipe({whitelist: true, transform: true})) account: UpdateAdminDto | UpdateBussinessDto | UpdateUserDto,
        @Req() req
    ): Promise<AccountOutputDto> {
        let result: AccountOutputDto;
        switch(getRoleGroup(req.user.role)){
            case 'user': 
                result = this.accountService.updateUser(req.user.userId, account);
            case 'admin': 
                result = this.accountService.updateAdmin(req.user.userId, account);
            case 'business':
                result = this.accountService.updateBusiness(req.user.userId, account);
        }
        return result;
    }

    
}
