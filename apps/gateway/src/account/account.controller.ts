import { AccountService } from './account.service';
import type { Response, Request } from 'express';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, 
    NotAcceptableException, 
    Param, Patch, Post, Put, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthDto, AccountOutputDto, CreateAccountDto, UpdateAccountDto, unauthorized, badRequest,
    getRoleGroup } from '@app/lib';
import { ConfigService } from '@nestjs/config';
import { User } from '../decorators/authGuard.decorator';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { cookieMaker } from '../helpers/cookieMaker';
import { PublicAccountDto } from '@app/lib/dtos/api/account/publicAccountDto';
import { type JwtPayload } from '../interfaces/JwtPayload';

@Controller('account')
export class AccountController {
    constructor(
        private readonly config: ConfigService, 
        private readonly accountService: AccountService
    ){}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getInfo(
        @User('accountId') accountId: string
    ): Promise<AccountOutputDto> {
        return this.accountService.getInfo(accountId);
    }

    @Post()
    @HttpCode(201)
    async addAccount(
        @Req() req: Request,
        @Body() account: CreateAccountDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto | void> {
        if(account.adminAccount){
            throw new UnauthorizedException(unauthorized.message);
        }
        const ip = req.ip ?? 'unknown';
        const device = req.headers['user-agent'] ?? 'unknown';
        const result = await this.accountService.addAccount(account, ip, device);
        if(result){
            res = cookieMaker(res, result.jwtAccess, result.partialAccount.refreshToken!, this.config);
            return new AuthDto(result.partialAccount);
        };
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    async updateAccount(
        @User('accountId') accountId: string,
        @Body() account: UpdateAccountDto
    ): Promise<AccountOutputDto | void> {
        if(!Object.keys(account).length){
            throw new BadRequestException(badRequest.message);
        };
        if(account.adminAccount){
            throw new UnauthorizedException(unauthorized.message);
        };
        return this.accountService.updateAccount(accountId, account);
    }

    @Patch('/password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async changePassword(
        @User('accountId') accountId: string,
        @Body() passwords: {oldPassword: string, newPassword:string}
    ): Promise<void> {
        await this.accountService.changePassword(accountId, passwords.oldPassword, passwords.newPassword);
    }

    @Patch('/cbu')
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async changeCBU(
        @User() data: JwtPayload,
        @Body('password') password: string,
        @Body('newCBU') newCBU: string,
    ): Promise<void> {
        if(getRoleGroup(data.role) === 'admin'){
            throw new NotAcceptableException();
        }
        await this.accountService.changeCBU(data.accountId, password, newCBU);
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async deleteAccount(
        @User('accountId') accountId: string,
        @Body('password') password: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<void> {
        await this.accountService.deleteAccount(accountId, password);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
    }

    @Get('/:username')
    async getAccountPublicInfo(
        @Param('username') username: string
    ): Promise<PublicAccountDto> {
        return this.accountService.getPublicInfo(username);
    }
}
