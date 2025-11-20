import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ERole } from 'libs/shared/role-enum';
import type { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {};
    
    @Post('/login')
    async logIn(
        @Body('auth') auth: { account: string; password: string },
        @Res({ passthrough: true }) res: Response
    ): Promise<{ username: string; role: ERole }> {
        const { partialAccount, jwtAccess } = await this.authService.logIn(
            auth.account,
            auth.password
        );
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
    ): Promise<string> {
        const refreshToken = req.user.refreshToken;
        const userId = req.user.userId;

        const { message, jwtAccess, jwtRefresh } = await this.authService.refresh(userId, refreshToken);
        res.cookie('accessToken', jwtAccess, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60
        });
        res.cookie('refreshToken', jwtRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24
        });

        return message;
    }
}
