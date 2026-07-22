import { Account, AccountOutputDto, AdminProfile, badRequest, CreateAccountDto, 
    EAccountStatus, ERole, errorMessage, getRoleGroup, MetaA, notFound, PartialAccountOutputDto, 
    Status, SuccessDto, unauthorized, uuidTransformer } from "@app/lib";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { GeneralService } from "./general.service";
import { Brackets, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { AccountService } from "./account.service";
import { firstValueFrom, retry, timeout } from "rxjs";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class AdminService {
    constructor(
        private readonly config: ConfigService,
        private readonly generalService: GeneralService,
        private readonly accountService: AccountService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(MetaA)
        private readonly metaRepository: Repository<MetaA>,
        @InjectRepository(Status)
        private readonly statusRepository: Repository<Status>,
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy,
    ){};

    private readonly logger = new Logger(AdminService.name);

    async getActiveList(adminId: string, offset = 0, limit = 30): Promise<SuccessDto<PartialAccountOutputDto[]>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data!.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const qb = this.generalService.partialAccount()
            const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Active })
                .andWhere('m.deleted IS NULL')
                .orderBy('m.created', 'DESC')
                .skip(offset)
                .take(limit)
                .getMany();
            
            const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async getBannedList(adminId: string, offset = 0, limit = 30): Promise<SuccessDto<PartialAccountOutputDto[]>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data!.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const qb = this.generalService.partialAccount()
            const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Banned })
                .andWhere('m.deleted IS NOT NULL')
                .orderBy('m.deleted', 'DESC')
                .skip(offset)
                .take(limit)
                .getMany();

            const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async getSuspendedList(adminId: string, offset = 0, limit = 30): Promise<SuccessDto<PartialAccountOutputDto[]>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data!.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const qb = this.generalService.partialAccount()
            const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Suspended })
                .andWhere('m.deleted IS NOT NULL')
                .orderBy('m.deleted', 'DESC')
                .skip(offset)
                .take(limit)
                .getMany();

            const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async getInactiveList(adminId: string, offset = 0, limit = 30): Promise<SuccessDto<PartialAccountOutputDto[]>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data!.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const qb = this.generalService.partialAccount()
            const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Inactive })
                .andWhere('m.deleted IS NOT NULL')
                .orderBy('m.deleted', 'DESC')
                .skip(offset)
                .take(limit)
                .getMany();

            const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
            
            return {
                success: true,
                data
            };
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async search(adminId: string, contains: string): Promise<SuccessDto<PartialAccountOutputDto[]>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const normalized = contains.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();
            if(!normalized || normalized.length < 3){
                return {
                    success: true,
                    data: []
                };
            };

            const term = `%${normalized}%`;

            const users = await this.accountRepository
                .createQueryBuilder('account')
                .leftJoinAndSelect('account.meta', 'meta')
                .leftJoinAndSelect('meta.status', 'status')
                .leftJoinAndSelect('meta.role', 'role')
                .leftJoinAndSelect('account.adminProfile', 'admin')
                .leftJoinAndSelect('account.userProfile', 'user')
                .leftJoinAndSelect('account.businessProfile', 'business')
                .where( new Brackets(qb => {
                    qb.where('account.username LIKE :term', { term })
                    .orWhere('account.email LIKE :term', { term })
                    .orWhere('admin.publicName LIKE :term', { term })
                    .orWhere('user.firstname LIKE :term', { term })
                    .orWhere('user.lastname LIKE :term', { term })
                    .orWhere('business.title LIKE :term', { term })
                    .orWhere('business.bio LIKE :term', { term })
                }))
                .orderBy('meta.created', 'DESC')
                .take(50)
                .getMany();

            const data = users.map((acc) => new PartialAccountOutputDto(acc));
            return {
                success: true,
                data 
            };
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async getAccountInfo(adminId: string, username: string): Promise<SuccessDto<AccountOutputDto>> {
        try{
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const result = await this.accountRepository
                .createQueryBuilder('a')
                .where('a.username = :username', { username })
                .getOne();

            if (!result) {
                return notFound;
            };

            return this.accountService.getInfo(result.id);
        }catch(err: any){
            return errorMessage(AdminService.name, err);
        }
    }

    async addAdmin(adminId: string, dto: CreateAccountDto): Promise<SuccessDto<void>> {
        try {
            if(!dto.adminAccount) return badRequest;

            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };
            
            await this.accountRepository.manager.transaction(async manager => {
                const hashed = await this.generalService.hashPassword(dto.password);
                
                const account = manager.create(Account, {
                    username: dto.username,
                    email: dto.email,
                    password: hashed
                }); 
                
                await manager.save(account);

                await manager.save(MetaA,{
                    accountId: account.id
                });

                await manager.save(AdminProfile, {
                    accountId: account.id,
                    publicName: dto.adminAccount.publicName
                });
            });

            return {
                success: true
            }
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async banAccount(adminId: string, email: string): Promise<SuccessDto<void>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const user = await this.accountRepository
                .createQueryBuilder('a')
                .innerJoinAndSelect('a.meta', 'm')
                .leftJoinAndSelect('m.status', 's')
                .where('a.email = :input', { input: email })
                .getOne();

            if (!user) {
                return badRequest;
            }

            if (user.meta.status.slug !== EAccountStatus.Banned) {
                const newStatus = await this.statusRepository.findOne({ where: { slug: EAccountStatus.Banned }});
                if(!newStatus){
                    throw new Error('Error finding the banned id on the Data Base');
                }

                await this.metaRepository
                    .createQueryBuilder()
                    .update(MetaA)
                    .set({ deletedBy: adminId, deleted: new Date(), statusId: newStatus.id })
                    .where('accountId = :id', { id: uuidTransformer.to(user.id) })
                    .execute();

                firstValueFrom(
                    this.productClient.emit('delete.account.data', { accountId: user.id})
                    .pipe(retry(1), timeout(1000))
                    ).catch(() => {
                    this.logger.warn(`Error emitting the banned account "${user.id}" to delete the products`);
                });

                return {
                    success: true
                };
            }else{
                return badRequest;
            }      
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }

    async restoreAccount(adminId: string, email: string): Promise<SuccessDto<void>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const user = await this.accountRepository
                .createQueryBuilder('a')
                .innerJoinAndSelect('a.meta', 'm')
                .leftJoinAndSelect('m.status', 's')
                .where('a.email = :input', { input: email })
                .getOne();

            if (!user) {
                return badRequest;
            }

            if (user.meta.status.slug !== EAccountStatus.Active) {
                const newStatus = await this.statusRepository.findOne({ where: { slug: EAccountStatus.Active }});
                if(!newStatus){
                    throw new Error('Error finding the active id on the Data Base');
                }

                await this.metaRepository
                    .createQueryBuilder()
                    .update(MetaA)
                    .set({ deletedBy: null, deleted: null, statusId: newStatus.id })
                    .where('accountId = :id', { id: uuidTransformer.to(user.id) })
                    .execute();

                return { 
                    success: true
                };
            }else{
                return badRequest;
            }      
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }  

    async suspendAccount(adminId: string, email: string): Promise<SuccessDto<void>> {
        try {
            const verify = await this.generalService.getPartialAccount(adminId);

            if(!verify.success){
                return {
                    success: verify.success, 
                    code: verify.code, 
                    message: verify.message
                };
            };

            if(getRoleGroup(verify.data?.meta.role.slug) !== ERole.Admin){
                return unauthorized;
            };

            const user = await this.accountRepository
                .createQueryBuilder('a')
                .innerJoinAndSelect('a.meta', 'm')
                .leftJoinAndSelect('m.status', 's')
                .where('a.email = :input', { input: email })
                .getOne();

            if (!user) {
                return badRequest;
            }

            if ((user.meta.status.slug !== EAccountStatus.Suspended) && (user.meta.status.slug !== EAccountStatus.Banned)) {
                const newStatus = await this.statusRepository.findOne({ where: { slug: EAccountStatus.Suspended }});
                if(!newStatus){
                    throw new Error('Error finding the suspended id on the Data Base');
                }

                await this.metaRepository
                    .createQueryBuilder()
                    .update(MetaA)
                    .set({ deletedBy: adminId, deleted: new Date(), statusId: newStatus.id })
                    .where('accountId = :id', { id: uuidTransformer.to(user.id) })
                    .execute();

                firstValueFrom(
                    this.productClient.emit('delete.account.data', { accountId: user.id})
                    .pipe(retry(1), timeout(1000))
                    ).catch(() => {
                    this.logger.warn(`Error emitting the suspended account "${user.id}" to delete the products`);
                });

                return {
                    success: true
                };
            }else{
                return badRequest;
            }      
        } catch (err: any) {
            return errorMessage(AdminService.name, err);
        }
    }  
}