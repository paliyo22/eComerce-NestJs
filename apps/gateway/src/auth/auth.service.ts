import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { firstValueFrom } from 'rxjs';
import { sign } from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor (
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
    ) {};

    async generateJwt(account: PartialAccountDto): Promise<string> {
        const payload = {
            userId: account.id,
            email: account.email,
            role: account.role,
        };

        return sign (
            payload, 
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );
    }
    
    async logIn(account: string, password: string): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }> {
        try {
        const result = await firstValueFrom(
            this.accountClient.send<SuccessDto<PartialAccountDto>>(
                { cmd: 'log_in' },
                { account, password }
            )
        );

        if (!result.success) {
            throw new HttpException(result.message!, result.code!);
        }

        const partialAccount = result.data!;

        const jwtAccess = await this.generateJwt(partialAccount);

        return { partialAccount, jwtAccess };

        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async logOut(userId: string): Promise<string> {
        try {
        const result = await firstValueFrom(
            this.accountClient.send<SuccessDto<void>>(
                { cmd: 'log_out' },
                { userId }
            )
        );

        if (!result.success) {
            throw new HttpException(result.message!, result.code!);
        }

        return result.message!;

        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async refresh(userId: string, refreshToken: string): Promise<{ 
        message: string, jwtAccess: string, jwtRefresh: string
    }> {
        try {
        const result = await firstValueFrom(
            this.accountClient.send<SuccessDto<PartialAccountDto>>(
                { cmd: 'refresh' },
                { userId, refreshToken }
            )
        );

        if (!result.success) {
            throw new HttpException(result.message!, result.code!);
        }

        const message = result.message!;

        const jwtAccess = await this.generateJwt(result.data!);

        const jwtRefresh = result.data!.refreshToken!;

        return { message, jwtAccess, jwtRefresh };

        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }
    
}