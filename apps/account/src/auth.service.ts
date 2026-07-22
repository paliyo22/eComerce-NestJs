import { Account, badRequest, banned, EAccountStatus, errorMessage, PartialAccountDto, RefreshToken, SuccessDto, suspended, uuidTransformer } from "@app/lib";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { sign } from 'jsonwebtoken';
import { compare } from "bcrypt";
import { GeneralService } from "./general.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly config: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshRepository: Repository<RefreshToken>,
        private readonly generalService: GeneralService  
    ){};

    private generateJwtRefresh(accountId: string): string {
        const payload = { accountId };
        return sign(
            payload, 
            this.config.get<string>('JWT_REFRESH_SECRET'), 
            { expiresIn: `${this.config.get<number>('REFRESH_TIME')}Ms` }
        );
    };

    async saveRefreshToken(accountId: string, ip: string, device: string): Promise<string> {
        const refreshToken = this.generateJwtRefresh(accountId);

        const entity = this.refreshRepository.create({
            token: refreshToken,
            accountId,
            device,
            ip,
            expiredAt: new Date(Date.now() + this.config.get<number>('REFRESH_TIME'))
        });

        await this.refreshRepository.upsert(entity, ['accountId', 'device']);
        return refreshToken;
    };

    async logIn(account: string, password: string, ip: string, device: string): Promise<SuccessDto<PartialAccountDto>> {
        try {
            const qb = this.generalService.partialAccount();
            const results = await qb.where('a.email = :acc', { acc: account })
                .orWhere('a.username = :acc', { acc: account })
                .getMany();
        
            const acc = results.find(r => r.email === account) ?? results[0] ?? null;
        
            if (!acc){
                return badRequest;
            }
        
            if (acc.meta.status.slug === EAccountStatus.Banned) {
                return banned;
            }
        
            if (acc.meta.status.slug === EAccountStatus.Suspended) {
                return suspended;
            }
        
            const valid = await compare(password, acc.password);
            if (!valid){
                return badRequest;
            }
        
            const result = new PartialAccountDto(acc);
            
            result.refreshToken = await this.saveRefreshToken(result.id, ip, device);
        
            return { success: true, data: result };
        } catch (err: any) {
            return errorMessage(AuthService.name, err);
        }
    }
    
    async logOut(accountId: string, device: string): Promise<void> {
        try {
            await this.refreshRepository
                .createQueryBuilder()
                .delete()
                .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .andWhere('device = :device', {device})
                .execute();
        } catch (err: any) {
            errorMessage(AuthService.name, err);
        }
    }
    
    async refresh(accountId: string, refreshToken: string, ip: string, device: string): Promise<SuccessDto<PartialAccountDto>> {
        try {
            const token = await this.refreshRepository.createQueryBuilder('rp')
                .where('rp.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                .andWhere('rp.device = :device', { device })
                .andWhere('rp.token = :tk', { tk: refreshToken })
                .getOne();
        
            if (!token) {
                return badRequest;
            }
        
            if (token.expiredAt.getTime() < Date.now()) {
                await this.refreshRepository.createQueryBuilder('rp')
                    .delete()
                    .where('rp.accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
                    .andWhere('rp.token = :tk', { tk: refreshToken })
                    .execute();
                    
                return badRequest;
            }
        
            const account = await this.generalService.getPartialAccount(accountId);
            if(!account.success){
                return {
                    success: account.success, 
                    code: account.code, 
                    message: account.message
                };
            }
        
            if (account.data!.meta.status.slug === EAccountStatus.Banned) {
                return banned;
            }
        
            if (account.data!.meta.status.slug === EAccountStatus.Suspended) {
                return suspended;
            }
        
            const partial = new PartialAccountDto(account.data!);
            
            partial.refreshToken = await this.saveRefreshToken(accountId, ip, device);
        
            return { 
                success: true, 
                data: partial 
            };
    
        } catch (err: any) {
            return errorMessage(AuthService.name, err);
        }
    }
}