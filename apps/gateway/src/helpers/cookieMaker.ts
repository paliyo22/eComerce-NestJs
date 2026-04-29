import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

export function cookieMaker (res: Response, accessToken: string, refreshToken: string, config: ConfigService): Response {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: config.get<number>('ACCESS_TIME')
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: config.get<number>('REFRESH_TIME')
    });
    return res;
}

