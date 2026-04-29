import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        @Inject(ConfigService)
        readonly config: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.cookies?.refreshToken
            ]),
            secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
            passReqToCallback: true
        });
    }

    validate(req: Request, payload: {accountId: string}) {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) throw new UnauthorizedException('Refresh token no encontrado');

        return { 
            accountId: payload.accountId,
            refreshToken
        };
    }
}