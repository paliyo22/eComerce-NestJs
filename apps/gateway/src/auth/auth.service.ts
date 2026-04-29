import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SuccessDto, PartialAccountDto, withRetry } from '@app/lib';
import { firstValueFrom } from 'rxjs';
import { sign } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { errorManager } from '../helpers/errorManager';

@Injectable()
export class AuthService {
    constructor (
        private readonly config: ConfigService, 
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
    ) {};

    async generateJwt(account: PartialAccountDto): Promise<string> {
        const payload = {
            accountId: account.id,
            email: account.email,
            role: account.role
        };

        return sign (
            payload, 
            this.config.get<string>('JWT_SECRET')!,
            { expiresIn: `${this.config.get<number>('ACCESS_TIME')!}Ms` }
        );
    }
    
    async logIn(account: string, password: string, ip: string, device: string): Promise<{ partialAccount: PartialAccountDto, jwtAccess: string }> {
        try {
        const result = await firstValueFrom(
            this.accountClient.send<SuccessDto<PartialAccountDto>>(
                { cmd: 'log_in' },
                { account, password, ip, device }
            ).pipe(withRetry())
        );

        if (!result.success) {
            throw new HttpException(result.message!, result.code!);
        }

        const partialAccount = result.data!;

        const jwtAccess = await this.generateJwt(partialAccount);

        return { partialAccount, jwtAccess };

        } catch (err) {
            throw errorManager(err, 'auth');
        }
    }

    async logOut(accountId: string, device: string): Promise<void> {
        try {
        await firstValueFrom(
            this.accountClient.emit('log.out', { accountId, device }
            ).pipe(withRetry())
        );
        } catch (err) {
            errorManager(err, 'auth');
        }
    }

    async refresh(accountId: string, refreshToken: string, ip: string, device: string): Promise<{ 
        partialAccount: PartialAccountDto, jwtAccess: string, jwtRefresh: string
    }> {
        try {
        const result = await firstValueFrom(
            this.accountClient.send<SuccessDto<PartialAccountDto>>(
                { cmd: 'refresh' },
                { accountId, refreshToken, ip, device }
            ).pipe(withRetry())
        );

        if (!result.success) {
            throw new HttpException(result.message!, result.code!);
        }

        const jwtAccess = await this.generateJwt(result.data!);

        return { partialAccount: result.data!, jwtAccess, jwtRefresh: result.data!.refreshToken! };

        } catch (err) {
            throw errorManager(err, 'auth');
        }
    }
}