import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { AuthDto } from './auth-dto';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {};
    
    @Post('/login')
    async logIn(
        @Body('auth') auth: { account: string; password: string },
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto> {
        const { partialAccount, jwtAccess } = await this.authService.logIn(
            auth.account,
            auth.password
        );
        res.cookie('accessToken', jwtAccess, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60
        });
        res.cookie('refreshToken', partialAccount.refreshToken!, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24
        });
        return AuthDto.fromEntity(partialAccount);
    };

    @Post('/logout')
    @UseGuards(JwtRefreshGuard)
    async logOut(
        @Req() req,
        @Res({ passthrough: true }) res: Response
    ): Promise<string> {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return this.authService.logOut(req.user.userId);
    }

    @Post('/refresh')
    @UseGuards(JwtRefreshGuard)
    async refresh(
        @Req() req,
        @Res({ passthrough: true }) res: Response
    ): Promise<AuthDto> {
        const refreshToken = req.user.refreshToken;
        const userId = req.user.userId;

        const { partialAccount, jwtAccess, jwtRefresh } = await this.authService.refresh(userId, refreshToken);
        res.cookie('accessToken', jwtAccess, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60
        });
        res.cookie('refreshToken', jwtRefresh, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24
        });

        return AuthDto.fromEntity(partialAccount);
    }
}
