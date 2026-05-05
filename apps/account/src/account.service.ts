import { Inject, Injectable, Logger } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { compare, hash} from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SuccessDto, PartialAccountDto, Account, Address, AdminProfile, BusinessProfile, 
  MetaA, RefreshToken, Store, UserProfile, AccountDto, AddressDto, CreateAddressDto, 
  CreateStoreDto, StoreDto, Status, ERole, getRoleGroup, errorMessage, EAccountStatus, 
  badRequest, banned, suspended, unauthorized, Balance, notFound, AccountOutputDto, 
  PartialAccountOutputDto, Withdrawal, WithdrawalDto, EStateStatus, EBalanceStatus, 
  CreateAccountDto, UpdateAccountDto, TransactionDto, withRetry, Increment} from '@app/lib';
import { firstValueFrom, from, retry, timeout } from 'rxjs';
import Redis from 'ioredis';
import EventEmitter from 'events';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AccountService {
  constructor(
    private readonly config: ConfigService, 
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Balance)
    private readonly balanceRepository: Repository<Balance>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepository: Repository<RefreshToken>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(MetaA)
    private readonly metaRepository: Repository<MetaA>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
    @Inject('PRODUCT_SERVICE') 
    private readonly productClient: ClientProxy
  ) {
    this.subscriber = this.redis.duplicate();
    this.setupGlobalSubscriber();
  }

  private subscriber: Redis;

  private responseEmitter = new EventEmitter();

  private setupGlobalSubscriber() {
    const pattern = 'transaction:done:*';
    this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (_, channel, message) => {
      this.responseEmitter.emit(channel, message);
    });
    this.subscriber.on('error', (err) => {
      this.logger.error('Global subscriber error', err);
    });
  }

  private readonly logger = new Logger(AccountService.name);

  private completeAccount() {
    return this.accountRepository
      .createQueryBuilder('account')
      .innerJoinAndSelect('account.meta', 'meta')
      .leftJoinAndSelect('meta.role', 'role')
      .leftJoinAndSelect('meta.status', 'status')
      .leftJoinAndSelect('account.userProfile', 'userProfile')
      .leftJoinAndSelect('account.businessProfile', 'businessProfile')
      .leftJoinAndSelect('account.adminProfile', 'adminProfile')
      .leftJoinAndSelect('account.stores', 'store')
      .leftJoinAndSelect('store.address', 'storeAddress')
      .leftJoinAndSelect('account.addresses', 'address');
  }

  private partialAccount() {
    return this.accountRepository
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.meta', 'm')
      .leftJoinAndSelect('m.role', 'r')
      .leftJoinAndSelect('m.status', 's');
  }

  private async hashPassword(raw: string): Promise<string> {
    return hash(raw, this.config.get<number>('SALT'));
  }

  private generateJwtRefresh(accountId: string): string {
    const payload = { accountId };
    return sign(
      payload, 
      this.config.get<string>('JWT_REFRESH_SECRET'), 
      { expiresIn: `${this.config.get<number>('REFRESH_TIME')}Ms` }
    );
  };

  private async saveRefreshToken(accountId: string, ip: string, device: string): Promise<string> {
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
  }

  private async getAccount (accountId: string): Promise<SuccessDto<Account>> {
    try {
      const qb = this.completeAccount();
      const account = await qb.where('account.id = :id', { id: accountId })
        .getOne();

      if (!account) {
        return notFound;
      }

      return { 
        success: true, 
        data: account 
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  private async getPartialAccount (id: string): Promise<SuccessDto<Account>> {
    try {
      const qb = this.partialAccount();
      const account = await qb.where('a.id = :id', { id })
        .getOne();

      if (!account) {
        return notFound;
      }

      return { 
        success: true, 
        data: account
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(luaScript, 1, lockKey, token).catch(() => {});
  }

  private async waitForTransaction(token: TransactionDto, timeoutMs: number): Promise<'completed' | 'failed'> {    
    return new Promise((resolve) => {
      const channel = `transaction:done:${token.uuid}`;
      const handleMessage = (status: string) => {
        cleanup();
        resolve(status === EStateStatus.Completed ? 'completed' : 'failed');
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.responseEmitter.removeListener(channel, handleMessage);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve('failed');
      }, timeoutMs);

      this.responseEmitter.on(channel, handleMessage);
    });
  }

  async check(token: TransactionDto): Promise<'completed' | 'failed' | 'try'> {
    const timeout = token.isInternal ? (this.config.get<number>('MESSAGE_TIMEOUT') + 1000) : 3100;
    const cacheKey = `transaction:${token.uuid}`;
    const cached = await firstValueFrom(from(this.redis.get(cacheKey)).pipe(withRetry(3))).catch(() => undefined);
    const lock = `lock:${token.uuid}`;
    const locked = await this.redis.set(lock, token.uuid, 'EX', 100, 'NX').catch(() => undefined);
    if(!locked){
      return await this.waitForTransaction(token, timeout);
    }else{
      if(cached){
        const result = JSON.parse(cached) as TransactionDto;
        if(result.status !== EStateStatus.Pending){
          const lock = `lock:${token.uuid}`;
          await this.releaseLock(lock, token.uuid).catch(() => {});    
          return result.status === EStateStatus.Completed ? 'completed' : 'failed';
        }
      }else{
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
          .pipe(withRetry(3)))
          .catch(() => undefined);
      };
      return 'try';
    } 
  }

  async logIn(account: string, password: string, ip: string, device: string): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const qb = this.partialAccount()
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
      return errorMessage(AccountService.name, err);
    }
  }

  async logOut(accountId: string, device: string): Promise<void> {
    try {
      await this.refreshRepository
        .createQueryBuilder()
        .delete()
        .where('accountId = :accountId', { accountId })
        .andWhere('device = :device', {device})
        .execute();

    } catch (err: any) {
      errorMessage(AccountService.name, err);
    }
  }

  async refresh(accountId: string, refreshToken: string, ip: string, device: string): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const token = await this.refreshRepository.createQueryBuilder()
      .where('accountId = :accountId', { accountId })
      .andWhere('device = :device', { device })
      .andWhere('token = :tk', { tk: refreshToken })
      .getOne();

      if (!token) {
        return badRequest;
      }

      if (token.expiredAt.getTime() < Date.now()) {
        await this.refreshRepository.createQueryBuilder()
          .delete()
          .where('accountId = :accountId', { accountId })
          .andWhere('token = :tk', { tk: refreshToken })
          .execute();
        return badRequest;
      }

      const account = await this.getPartialAccount(accountId);
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
      return errorMessage(AccountService.name, err);
    }
  }

  async getInfo(accountId: string): Promise<SuccessDto<AccountOutputDto>> {
    try {
      const account = await this.getAccount(accountId);
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

      const hashed = await this.hashPassword(dto.password);

      const accountEntity = await this.accountRepository.manager.transaction(async manager => {
        const account = await manager.save(Account, {
          username: dto.username,
          email: dto.email,
          password: hashed,
        });

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
          .where('a.id = :id', { id: account.id })
          .getOne();
      });

      const partial = new PartialAccountDto(accountEntity);
      try{
        partial.refreshToken = await this.saveRefreshToken(accountEntity.id, ip, device);
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
      const current = await this.getAccount(accountId);
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
        account.userProfile.birth = dto.userAccount.birth ?? account.userProfile.birth;
        account.userProfile.phone = dto.userAccount.phone ?? account.userProfile.phone;  
      };

      if(!accountChanges && !profileChanges) return badRequest;

      if(profileChanges){
        await this.accountRepository.manager.transaction(async manager => {
          if(accountChanges){
            await manager.createQueryBuilder()
              .update(Account)
              .set({ email: account.email, username: account.username})
              .where('id = :id', { id: accountId })
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
          .where('id = :id', { id: accountId })
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
      const account = await this.getPartialAccount(accountId);
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
        throw new Error('Error finding the banned id on the Data Base');
      };
      await this.metaRepository
        .createQueryBuilder()
        .update(MetaA)
        .set({ deletedBy: accountId, deleted: new Date(), statusId: newStatus.id })
        .where('accountId = :accountId', { accountId })
        .execute();

      firstValueFrom(
        this.productClient.emit('delete.account.data', { accountId})
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
      const result = await this.getPartialAccount(accountId);
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

      const hashed = await this.hashPassword(newPassword);
      await this.accountRepository.update({id: accountId}, { password: hashed });
      
      return { success: true };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getAddress(accountId: string): Promise<SuccessDto<AddressDto[]>>{
    try {
      const addresses = await this.addressRepository
        .createQueryBuilder('a')
        .where('a.accountId = :accountId', {accountId})
        .getMany();

      if(!addresses.length){
        return {
          success: true,
          data: []
        };
      };

      const data = addresses.map((a) => new AddressDto(a));

      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async addAddress(accountId: string, dto: CreateAddressDto): Promise<SuccessDto<AddressDto>> {
    try {
      const address = await this.addressRepository.save({
        accountId: accountId,
        address: dto.address,
        apartment: dto.apartment ?? null,
        city: dto.city,
        zip: dto.zip,
        country: dto.country
      });

      return { success: true, data: new AddressDto(address) };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async deleteAddress(accountId: string, addressId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.addressRepository
        .createQueryBuilder()
        .delete()
        .where('accountId = :accountId', {accountId})
        .andWhere('id = :id', { id: addressId })
        .execute();

      if (!result.affected) {
        return notFound
      };

      return { 
        success: true
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getStores(accountId?: string, username?: string): Promise<SuccessDto<StoreDto[]>> {
    try {
      const qb = this.accountRepository
        .createQueryBuilder('a')
        .innerJoinAndSelect('a.meta', 'm')
        .leftJoinAndSelect('m.status', 'st')
        .leftJoinAndSelect('a.stores', 's')
        .leftJoinAndSelect('s.address', 'sa');
      if(!accountId && !username){
        return badRequest;
      }else{
        if(accountId){
          qb.where('a.id = :accountId', {accountId});
        }else{
          qb.where('a.username = :username', {username});
        };
      };
      const result = await qb.getOne();

      if(!result){
        return notFound;
      }

      if(result.meta.status.slug === EAccountStatus.Banned){
        return banned;
      }

      const data: StoreDto[] = []; 
      result.stores.forEach((s) => { data.push(new StoreDto(s)) });
      return {
        success: true,
        data
      }      
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  } 
  
  async addStore(accountId: string, dto: CreateStoreDto): Promise<SuccessDto<StoreDto>> {
    try {
      const result = await this.storeRepository.manager.transaction(async manager => {
        const store = await manager.save(Store, {
          accountId: accountId,
          phone: dto.phone
        });

        const address = await manager.save(Address, {
          storeId: store.id,
          address: dto.address,
          apartment: dto.apartment ?? null,
          city: dto.city,
          zip: dto.zip,
          country: dto.country
        });

        store.address = address;

        return store;
      }); 

      return { 
        success: true, 
        data: new StoreDto(result)
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async deleteStore(accountId: string, storeId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.storeRepository
        .createQueryBuilder()
        .delete()
        .where('id = :storeId', { storeId })
        .andWhere('accountId = :accountId', { accountId })
        .execute();
      
      if (!result.affected) {
        return notFound;
      };
      
      return { 
        success: true 
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getBalance(accountId: string): Promise<SuccessDto<number>> {
    try {
      const result = await this.balanceRepository
        .createQueryBuilder()
        .where('accountId = :id', {id: accountId})
        .getOne();

      if(!result){
        return errorMessage(AccountService.name);
      }

      return{
        success: true,
        data: result.amount
      }
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getWithdrawals(accountId: string): Promise<SuccessDto<WithdrawalDto[]>>{
    try {
      const result = await this.withdrawalRepository
        .createQueryBuilder()
        .where('accountId = :id', { id: accountId })
        .andWhere('status != :status', { status: EStateStatus.Pending })
        .getMany();

      const data = result.map((w) => new WithdrawalDto(w));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async withdraw(accountId: string, amount: number, token: TransactionDto): Promise<SuccessDto<WithdrawalDto>> {
    if(amount <= 0){
      return badRequest;
    };
    const cacheKey = `transaction:${token.uuid}`;
    try {
      const result = await this.balanceRepository.manager.transaction(async (manager): Promise<Withdrawal | 'ERROR' | 'BAD_REQUEST'> => {
        const balance = await manager.createQueryBuilder(Balance, 'b')
          .setLock('pessimistic_write')
          .where('b.accountId = :id', { id: accountId })
          .getOne();

        const account = await manager.createQueryBuilder(Account, 'a')
          .leftJoinAndSelect('a.userProfile', 'u')
          .leftJoinAndSelect('a.businessProfile', 'b')
          .where('a.id = :id', { id: accountId })
          .getOne();
        
        if(!balance || !account){
          return 'ERROR';
        };

        const cbu = account.businessProfile?.cbu ?? account.userProfile?.cbu;
        if(!cbu){
          return 'BAD_REQUEST';
        };

        await manager.createQueryBuilder(Balance, 'b')
          .update(Balance)
          .set({ status: EBalanceStatus.PROCESSING })
          .where('b.accountId = :id', { id: accountId })
          .execute();

        const withdrawal = manager.create(Withdrawal, {
          token: token.uuid,
          accountId: accountId,
          amount: amount,
          cbu: cbu
        });
        
        const newWithdrawal = await manager.save(Withdrawal, withdrawal);
        let result: Withdrawal;
        if(balance.amount < amount){
          await manager.createQueryBuilder(Withdrawal, 'w')
            .update(Withdrawal)
            .set({ status: EStateStatus.Failed })  
            .where('w.token = :token', { token: newWithdrawal.token })
            .andWhere('w.accountId = :accountId', { accountId })
            .execute();
          newWithdrawal.status = EStateStatus.Failed;
          result = newWithdrawal
        }else{
          balance.amount -= amount;
          await manager.save(Balance, balance);
          await manager.createQueryBuilder(Withdrawal, 'w')
            .update(Withdrawal)
            .set({ status: EStateStatus.Completed })  
            .where('w.token = :token', { token: newWithdrawal.token })
            .andWhere('w.accountId = :accountId', { accountId })
            .execute();
          newWithdrawal.status = EStateStatus.Completed;
          result = newWithdrawal;
        };
        await manager.createQueryBuilder(Balance, 'b')
          .update(Balance)
          .set({ status: EBalanceStatus.IDLE })
          .where('b.accountId = :id', { id: accountId })
          .execute();
        return result;
      }); 

      if(result === 'BAD_REQUEST'){
        token.status = EStateStatus.Failed;
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
          .pipe(withRetry(3)))
          .catch(() => {});
        return badRequest;
      };
      
      if(result === 'ERROR'){
        token.status = EStateStatus.Failed;
        await firstValueFrom(
          from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
          .pipe(withRetry(3)))
          .catch(() => {});
        this.logger.error(`Error finding account: ${accountId} balance.`);
        return errorMessage(AccountService.name);
      };

      token.status = EStateStatus.Completed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});
        
      return {
        success: true,
        data: new WithdrawalDto(result)
      }
    } catch (err: any) {
      token.status = EStateStatus.Failed;
      await firstValueFrom(
        from(this.redis.set(cacheKey, JSON.stringify(token), 'KEEPTTL'))
        .pipe(withRetry(3)))
        .catch(() => {});
      return errorMessage(AccountService.name, err);
    }finally{
      const lock = `lock:${token.uuid}`;
      await this.releaseLock(lock, token.uuid); 
      await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
    }
  }
  //------------------ ADMIN FUNCTIONS -------------------------------
  async getActiveList(adminId: string, offset?: number, limit?: number): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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

      const qb = this.partialAccount()
      const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Active })
        .andWhere('m.deleted IS NULL')
        .orderBy('m.created', 'DESC')
        .skip(offset ?? 0)
        .take(limit ?? 30)
        .getMany();
      
      const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getBannedList(adminId: string, offset?: number, limit?: number): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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

      const qb = this.partialAccount()
      const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Banned })
        .andWhere('m.deleted IS NOT NULL')
        .orderBy('m.deleted', 'DESC')
        .skip(offset ?? 0)
        .take(limit ?? 30)
        .getMany();

      const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getSuspendedList(adminId: string, offset?: number, limit?: number): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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

      const qb = this.partialAccount()
      const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Suspended })
        .andWhere('m.deleted IS NOT NULL')
        .orderBy('m.deleted', 'DESC')
        .skip(offset ?? 0)
        .take(limit ?? 30)
        .getMany();

      const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getInactiveList(adminId: string, offset?: number, limit?: number): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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

      const qb = this.partialAccount()
      const accounts = await qb.where('s.slug = :slug', { slug: EAccountStatus.Inactive })
        .andWhere('m.deleted IS NOT NULL')
        .orderBy('m.deleted', 'DESC')
        .skip(offset ?? 0)
        .take(limit ?? 30)
        .getMany();

      const data = accounts.map((acc) => new PartialAccountOutputDto(acc));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async search(adminId: string, contains: string): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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
      return errorMessage(AccountService.name, err);
    }
  }

  async getAccountInfo(password: string, username: string): Promise<SuccessDto<AccountOutputDto>> {
    try{
      if(password !== this.config.get<string>('INTERNAL_ADMIN_PASSWORD')){
        return unauthorized;
      };

      const result = await this.accountRepository
        .createQueryBuilder('a')
        .where('a.username = :username', { username })
        .getOne();

      if (!result) {
        return notFound;
      };

      return this.getInfo(result.id);
    }catch(err: any){
      return errorMessage(AccountService.name, err);
    }
  }

  async addAdmin(password: string, dto: CreateAccountDto): Promise<SuccessDto<void>> {
    try {
      if(password !== this.config.get<string>('INTERNAL_ADMIN_PASSWORD')){
        return unauthorized;
      };

      if(!dto.adminAccount) return badRequest;
      
      await this.accountRepository.manager.transaction(async manager => {
        const hashed = await this.hashPassword(dto.password);
        
        const account = await manager.save(Account, {
          username: dto.username,
          email: dto.email,
          password: hashed
        });

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
      return errorMessage(AccountService.name, err);
    }
  }

  async banAccount(adminId: string, mail: string): Promise<SuccessDto<void>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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
      .where('a.email = :input', { input: mail })
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
          .where('accountId = :id', { id: user.id })
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
      return errorMessage(AccountService.name, err);
    }
  }

  async restoreAccount(adminId: string, mail: string): Promise<SuccessDto<void>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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
      .where('a.email = :input', { input: mail })
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
          .where('accountId = :id', { id: user.id })
          .execute();

        return { 
          success: true
        };
      }else{
        return badRequest;
      }      
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }  

  async suspendAccount(adminId: string, mail: string): Promise<SuccessDto<void>> {
    try {
      const verify = await this.getPartialAccount(adminId);

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
      .where('a.email = :input', { input: mail })
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
          .where('accountId = :id', { id: user.id })
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
      return errorMessage(AccountService.name, err);
    }
  }  

  //------------------ EVENT FUNCTIONS -------------------------------
  async getAccountListInfo(accountIds: string[]): Promise<SuccessDto<AccountDto[]>> {
    try {
      if (!accountIds.length) {
        return { 
          success: true, 
          data: [] 
        };
      }

      const qb = this.completeAccount();
      const account = await qb.where('account.id IN (:...ids)', { ids: accountIds })
        .getMany();

      const data = account.map((acc) => new AccountDto(acc));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async getPartialAccountListInfo(accountIds: string[]): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      if (!accountIds.length) {
        return { 
          success: true, 
          data: [] 
        };
      };

      const qb = this.partialAccount();
      const account = await qb.where('a.id IN (:...ids)', { ids: accountIds })
        .getMany();

      const data = account.map((acc) => new PartialAccountDto(acc));
      
      return {
        success: true,
        data
      };
    } catch (err: any) {
      return errorMessage(AccountService.name, err);
    }
  }

  async addToBalance(accounts: {accountId: string, balance: number}[], token: TransactionDto): Promise<void> {
    const failures: { id: string; amount: number; error: any }[] = [];
    const cacheKey = `transaction:${token.uuid}`;

    for (const a of accounts) {
      try {
        await this.accountRepository.manager.transaction(async manager => {
          await manager.increment(Balance,
            { accountId: a.accountId },
            'amount',
            a.balance
          );
          await manager.insert(Increment, { token: token.uuid, accountId: a.accountId, amount: a.balance });
        });
      } catch (err: any) {
        failures.push({ id: a.accountId, amount: a.balance, error: err?.message ?? err });
      }
    }

    if (failures.length) {
      this.logger.fatal(`addToBalance failed for ${failures.length} accounts: \n${failures}`);
    }
    token.status = EStateStatus.Completed;
    await firstValueFrom(
      from(this.redis.set(cacheKey, JSON.stringify(token), 'EX', 3600))
      .pipe(withRetry(3)))
      .catch(() => undefined);
    const lock = `lock:${token.uuid}`;
    await this.releaseLock(lock, token.uuid);
    await this.redis.publish(`transaction:done:${token.uuid}`, token.status).catch(() => {});
  }
}
