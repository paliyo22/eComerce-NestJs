import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { AuthDto, LoginDto } from '@app/lib';
import { ConfigService } from '@nestjs/config';
import { RefreshUser } from '../decorators/refreshGuard.decorator';
import { JwtRefreshGuard } from '../guards/jwtRefresh.guard';
import { cookieMaker } from '../helpers/cookieMaker';
import type { RefreshJwtPayload } from '../interfaces/refreshJwtPayload';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly config: ConfigService, 
        private readonly authService: AuthService
    ) {};
    
    @Post('/login')
    async logIn(
        @Req() req: Request,
        @Body() auth: LoginDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto> {
        const ip = req.ip ?? 'unknown';
        const device = req.headers['user-agent'] ?? 'unknown';
        const { partialAccount, jwtAccess } = await this.authService.logIn(auth.account, auth.password, ip, device);
        res = cookieMaker(res, jwtAccess, partialAccount.refreshToken!, this.config);
        return new AuthDto(partialAccount);
    };

    @Post('/logout')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(204)
    async logOut(
        @Req() req: Request,
        @RefreshUser('accountId') accountId: string,
        @Res({ passthrough: true }) res: Response
    ): Promise<void> {
        const device = req.headers['user-agent'] ?? 'unknown';
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        this.authService.logOut(accountId, device);
    }

    @Post('/refresh')
    @UseGuards(JwtRefreshGuard)
    async refresh(
        @Req() req: Request,
        @RefreshUser() user: RefreshJwtPayload,
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto> {
        const ip = req.ip ?? 'unknown';
        const device = req.headers['user-agent'] ?? 'unknown';
        const { partialAccount, jwtAccess, jwtRefresh } = await this.authService.refresh(user.accountId, user.refreshToken, ip, device);
        
        res = cookieMaker(res, jwtAccess, jwtRefresh, this.config);
        return new AuthDto(partialAccount);
    }
}