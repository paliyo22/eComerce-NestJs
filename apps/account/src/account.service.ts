import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { compare } from 'bcrypt';
import { SuccessDto, PartialAccountDto, Account, AdminProfile, BusinessProfile, MetaA, 
  UserProfile, AccountDto, Status, errorMessage, EAccountStatus, badRequest, banned, 
  unauthorized, AccountOutputDto, CreateAccountDto, UpdateAccountDto, uuidTransformer, 
  PartialProductDto } from '@app/lib';
import { firstValueFrom, retry, timeout } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { PublicAccountDto } from '@app/lib/dtos/api/account/publicAccountDto';
import { AuthService } from './auth.service';
import { GeneralService } from './general.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(MetaA)
    private readonly metaRepository: Repository<MetaA>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    @Inject('PRODUCT_SERVICE') 
    private readonly productClient: ClientProxy,
    private readonly authService: AuthService,
    private readonly generalService: GeneralService
  ) {}  

  private readonly logger = new Logger(AccountService.name);

  async getInfo(accountId: string): Promise<SuccessDto<AccountOutputDto>> {
    try {
      const account = await this.generalService.getAccount(accountId);
      if(!account.success){
        return {
          success: account.success, 
          code: account.code, 
          message: account.message
        };
      }

      if(!account.data) return badRequest;

      const accountDto = new AccountOutputDto(account.data);

      return { 
        success: true, 
        data: accountDto 
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async addAccount(
    dto: CreateAccountDto,
    ip: string, 
    device: string
  ): Promise<SuccessDto<PartialAccountDto>> {
    try {
      if(dto.adminAccount){
        return badRequest;
      };

      const hashed = await this.generalService.hashPassword(dto.password);

      const accountEntity = await this.accountRepository.manager.transaction(async manager => {
        const account = manager.create(Account, {
          username: dto.username,
          email: dto.email,
          password: hashed,
        });
        await manager.save(account);

        await manager.save(MetaA, { 
          accountId: account.id
        });

        if(dto.businessAccount){
          await manager.save(BusinessProfile, {
            accountId: account.id,
            title: dto.businessAccount.title,
            bio: dto.businessAccount.bio ?? null,
            phone: dto.businessAccount.phone
          });
        };

        if(dto.userAccount){
          await manager.save(UserProfile, {
            accountId: account.id,
            firstname: dto.userAccount.firstname,
            lastname: dto.userAccount.lastname,
            birth: dto.userAccount.birth ? new Date(dto.userAccount.birth) : null,
            phone: dto.userAccount.phone ?? null
          });
        };

        return await manager
          .createQueryBuilder(Account, 'a')
          .innerJoinAndSelect('a.meta', 'm')
          .leftJoinAndSelect('m.role', 'r')
          .leftJoinAndSelect('m.status', 's')
          .where('a.id = :id', { id: uuidTransformer.to(account.id) })
          .getOne();
      });

      const partial = new PartialAccountDto(accountEntity);
      try{
        partial.refreshToken = await this.authService.saveRefreshToken(accountEntity.id, ip, device);
      } catch {
        this.logger.error('Failure trying to save the refreshToken on addAccount');
      };
      if(partial.refreshToken){
        return { 
          success: true, 
          data: partial
        };
      }else{
        return {
          success: true
        };
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('account.email')) {
          return { 
            success: false, 
            message: 'EMAIL_NOT_AVAILABLE', 
            code: 400 
          };
        }
        if (err.message.includes('account.username')) {
          return {
            success: false, 
            message: 'USERNAME_NOT_AVAILABLE', 
            code: 400 
          };
        }
      }
      return errorMessage(AccountService.name, err);
    }
  }

  async updateAccount(
    accountId: string, 
    dto: UpdateAccountDto
  ): Promise<SuccessDto<AccountOutputDto>> {
    try {
      const current = await this.generalService.getAccount(accountId);
      if (!current.success) {
        return { 
          success: current.success, 
          code: current.code, 
          message: current.message 
        };
      }
      const account = current.data!;
      let accountChanges = false;
      let profileChanges = false;

      if (
        (dto.businessAccount && !account.businessProfile) || 
        (dto.userAccount && !account.userProfile) || 
        (dto.adminAccount && !account.adminProfile)
      ) return unauthorized;

      if(dto.email || dto.username){
        accountChanges = true;
        account.email = dto.email ?? account.email;
        account.username = dto.username ?? account.username;
      }

      if(dto.adminAccount){
        profileChanges = true;
        account.adminProfile.publicName = dto.adminAccount.publicName;
      };
      if(dto.businessAccount){
        profileChanges = true;
        account.businessProfile.title = dto.businessAccount.title ?? account.businessProfile!.title;
        account.businessProfile.bio = dto.businessAccount.bio ?? account.businessProfile!.bio;
        account.businessProfile.phone = dto.businessAccount.phone ?? account.businessProfile!.phone;
      };
      if(dto.userAccount){
        profileChanges = true;
        account.userProfile.firstname = dto.userAccount.firstname ?? account.userProfile.firstname;
        account.userProfile.lastname = dto.userAccount.lastname ?? account.userProfile.lastname;
        account.userProfile.birth = dto.userAccount.birth ? new Date(dto.userAccount.birth) : account.userProfile.birth;
        account.userProfile.phone = dto.userAccount.phone ?? account.userProfile.phone;  
      };

      if(!accountChanges && !profileChanges) return badRequest;

      if(profileChanges){
        await this.accountRepository.manager.transaction(async manager => {
          if(accountChanges){
            await manager.createQueryBuilder()
              .update(Account)
              .set({ email: account.email, username: account.username})
              .where('id = :id', { id: uuidTransformer.to(accountId) })
              .execute();
          };
          if(dto.adminAccount){
            await manager.save(AdminProfile, account.adminProfile!);
          }else if(dto.businessAccount){
            await manager.save(BusinessProfile, account.businessProfile!);
          }else {
            await manager.save(UserProfile, account.userProfile!);
          }
        });
      }else {
        await this.accountRepository.createQueryBuilder()
          .update(Account)
          .set({ email: account.email, username: account.username})
          .where('id = :id', { id: uuidTransformer.to(accountId) })
          .execute();
      };
      
      const result = await this.getInfo(accountId);
      if(!result.success){
        return{
          success: true
        };
      }
      return result;
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('account.email')) {
          return { 
            success: false, 
            message: 'EMAIL_NOT_AVAILABLE', 
            code: 400 
          };
        }
        if (err.message.includes('account.username')) {
          return {
            success: false, 
            message: 'USERNAME_NOT_AVAILABLE', 
            code: 400 
          };
        }
      }
      return errorMessage(AccountService.name, err);
    }
  }

  async deleteAccount(accountId: string, password: string): Promise<SuccessDto<void>> {
    try {
      const account = await this.generalService.getPartialAccount(accountId);
      if(!account.success){
        return {
          success: account.success, 
          code: account.code, 
          message: account.message
        };
      }

      const valid = await compare(password, account.data!.password);
      if (!valid){
        return badRequest;
      }

      const newStatus = await this.statusRepository.findOne({ where: { slug: EAccountStatus.Inactive }});
      if(!newStatus){
        throw new Error('Error finding the account id on the Data Base');
      };
      await this.metaRepository
        .createQueryBuilder()
        .update(MetaA)
        .set({ deletedBy: accountId, deleted: new Date(), statusId: newStatus.id })
        .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
        .execute();

      firstValueFrom(
        this.productClient.emit('delete.account.data', { accountId })
        .pipe(retry(1), timeout(1000))
      ).catch(() => {
        this.logger.warn(`Error emitting the deleted account "${accountId}" to delete the products`);
      });

      return { success: true };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async changePassword(accountId: string, oldPassword: string, newPassword: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.generalService.getPartialAccount(accountId);
      if(!result.success){
        return {
          success: false,
          code: result.code,
          message: result.message
        }
      };

      const valid = await compare(oldPassword, result.data!.password);
      if(!valid){
        return badRequest;
      };

      const hashed = await this.generalService.hashPassword(newPassword);
      await this.accountRepository.update({id: accountId}, { password: hashed });
      
      return { success: true };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getPublicAccount (username: string): Promise<SuccessDto<PublicAccountDto>> {
    try {
      const qb = this.generalService.completeAccount();
      const account = await qb.where('account.username = :username', { username })
        .getOne(); 
      
      if(!account){
        return badRequest;
      };

      if(account.meta.status.slug === EAccountStatus.Banned){
        return banned;
      };

      const products = await firstValueFrom(
        this.productClient.send<SuccessDto<PartialProductDto[]>>(
          {cmd: 'get_account_products'},
          { id: account.id }
        ).pipe(timeout(2000))
      );

      if(!products.success){
        return {
          success: false,
          message: products.message,
          code: products.code
        }
      };

      const data = new PublicAccountDto(new AccountDto(account), products.data);

      return {
        success: true,
        data
      }
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async publicSearch(contains: string, limit?: number): Promise<SuccessDto<string[]>> {
    try {
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
        .leftJoinAndSelect('account.userProfile', 'user')
        .leftJoinAndSelect('account.businessProfile', 'business')
        .where( new Brackets(qb => {
          qb.where('account.username LIKE :term', { term })
          .orWhere('account.email LIKE :term', { term })
          .orWhere('user.firstname LIKE :term', { term })
          .orWhere('user.lastname LIKE :term', { term })
          .orWhere('business.title LIKE :term', { term })
          .orWhere('business.bio LIKE :term', { term })
        }))
        .orderBy('meta.created', 'DESC')
        .take(50)
        .getMany();

      const data = users.map((acc) => acc.username);
      return {
        success: true,
        data 
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async changeCbu(accountId: string, password: string, newCBU: string): Promise<SuccessDto<void>> {
    try {
      const account = await this.generalService.getAccount(accountId);

      if(!account.success){
        return {
          success: account.success, 
          code: account.code, 
          message: account.message
        }
      };

      const valid = await compare(password, account.data.password);
      if (!valid){
        return badRequest;
      }

      if(account.data.businessProfile){
        await this.accountRepository.createQueryBuilder()
          .update(BusinessProfile)
          .set({ cbu: newCBU })
          .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
          .execute();  
      }else{
        await this.accountRepository.createQueryBuilder()
          .update(UserProfile)
          .set({ cbu: newCBU })
          .where('accountId = :accountId', { accountId: uuidTransformer.to(accountId) })
          .execute();
      };
      
      return {
        success: true
      };
    }catch(err: any) {
      return errorMessage(AccountService.name, err);
    }
  }
  
  //---------------------- Initial load for TESTING ---------------------------------
  async loadDefaultAccounts(dto: CreateAccountDto[]): Promise<SuccessDto<string[]>> {
    try {
      const result: string[] = [];
      for (const a of dto) {
        const id = await this.load(a);
        result.push(id);
      }

      return {
        success: true,
        data: result
      };
    } catch (err: any) {
      this.logger.fatal(err);
      return {
        success: false
      };
    }
  }
  private async load(dto: CreateAccountDto): Promise<string> {
    const hashed = await this.generalService.hashPassword(dto.password);

    return this.accountRepository.manager.transaction(async manager => {
      const account = manager.create(Account, {
        username: dto.username,
        email: dto.email,
        password: hashed,
      });
      await manager.save(account);

      await manager.save(MetaA, { 
        accountId: account.id
      });

      if(dto.businessAccount){
        await manager.save(BusinessProfile, {
          accountId: account.id,
          title: dto.businessAccount.title,
          bio: dto.businessAccount.bio ?? null,
          phone: dto.businessAccount.phone
        });
      };

      if(dto.userAccount){
        await manager.save(UserProfile, {
          accountId: account.id,
          firstname: dto.userAccount.firstname,
          lastname: dto.userAccount.lastname,
          birth: dto.userAccount.birth ? new Date(dto.userAccount.birth) : null,
          phone: dto.userAccount.phone ?? null
        });
      };

      if(dto.adminAccount){
        await manager.save(AdminProfile, {
          accountId: account.id,
          publicName: dto.adminAccount.publicName
        });
      };

      return account.id;
    });
  }
}
