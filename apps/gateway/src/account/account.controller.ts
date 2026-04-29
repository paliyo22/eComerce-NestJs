import { AccountService } from './account.service';
import type { Response, Request } from 'express';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, 
    Patch, Post, Put, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthDto, AccountOutputDto, CreateAccountDto, UpdateAccountDto, unauthorized, badRequest } from '@app/lib';
import { ConfigService } from '@nestjs/config';
import { User } from '../decorators/authGuard.decorator';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import { cookieMaker } from '../helpers/cookieMaker';

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
    async updateBusiness(
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

    @Patch()
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async changePassword(
        @User('accountId') accountId: string,
        @Body() passwords: {oldPassword: string, newPassword:string}
    ): Promise<void> {
        await this.accountService.changePassword(accountId, passwords.oldPassword, passwords.newPassword);
    }

    @Delete('/delete')
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async deleteAccount(
        @User('accountId') accountId: string,
        @Body('password') password: string
    ): Promise<void> {
        await this.accountService.deleteAccount(accountId, password);
    }
}
