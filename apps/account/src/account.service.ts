import { Injectable } from '@nestjs/common';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { sign } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Account, Address, AdminProfile, BusinessProfile, Meta, RefreshToken, Role, Store, UserProfile } from 'apps/account/src/entities';
import { Repository } from 'typeorm';
import { compare, hash} from 'bcrypt';
import { AccountDto, CreateAdminDto, CreateBusinessDto, CreateUserDto, UpdateAdminDto, UpdateBusinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';
import { ERole, getRoleGroup } from 'libs/shared/role-enum';
import { uuidTransformer } from 'libs/shared';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepository: Repository<RefreshToken>,
  ) {}

  private async hashPassword(raw: string): Promise<string> {
    return hash(raw, Number(process.env.SALT));
  }

  private async generateJwt(account: PartialAccountDto): Promise<string> {
    const payload = { userId: account.id };
    return sign(payload, String(process.env.JWT_REFRESH_SECRET), { expiresIn: '1d' });
  }

  private async saveToken(accountId: string, refreshToken: string): Promise<void> {
    await this.refreshRepository.delete({accountId});
    const entity = this.refreshRepository.create({
      id: refreshToken,
      accountId,
      device: 'unknown',
      ip: 'unknown',
      expiredAt: new Date(Date.now() + 86400000)
    });

    await this.refreshRepository.save(entity);
  }

  async getAccount (accountId: string): Promise<SuccessDto<Account>> {
    try {
      console.log(accountId);
      const account = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('meta.status', 'status')
        .leftJoinAndSelect('account.userProfile', 'userProfile')
        .leftJoinAndSelect('account.businessProfile', 'businessProfile')
        .leftJoinAndSelect('account.adminProfile', 'adminProfile')
        .leftJoinAndSelect('account.stores', 'store')
        .leftJoinAndSelect('store.address', 'storeAddress')
        .leftJoinAndSelect('account.addresses', 'address')
        .where('account.id = UUID_TO_BIN(:id)', { id: accountId })
        .getOne();

      if (!account) {
        return { success: false, message: 'Token inválido o usuario inexistente.', code: 401 };
      }

      return { success: true, data: account };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener la información de la cuenta',
      };
    }
  }

  async logIn(account: string, password: string): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const acc = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('meta.status', 'status')
        .where('account.email = :acc OR account.username = :acc', { acc: account })
        .getOne();

      if (!acc){
        return { success: false, message: 'Cuenta no encontrada', code: 400 };
      }

      if (acc.meta.status.slug === 'banned') {
        return {
          success: false,
          message: 'Cuenta suspendida temporalmente',
          code: 403
        };
      }

      const valid = await compare(password, acc.password);
      if (!valid){
        return { success: false, message: 'Credenciales inválidas', code: 400 };
      }

      const result = PartialAccountDto.fromEntity(acc);
      result.refreshToken = await this.generateJwt(result);

      await this.saveToken(result.id, result.refreshToken);

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al conectar con la base de datos de cuenta',
      };
    }
  }

  async logOut(userId: string): Promise<SuccessDto<void>> {
    try {
      await this.refreshRepository
        .createQueryBuilder()
        .delete()
        .where('account_id = UUID_TO_BIN(:id)', { id: userId })
        .andWhere('device = :device', {device: 'unknown'})
        .execute();


      return { 
        success: true, 
        message: 'Hasta la proxima' 
      };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al conectar con la base de datos de cuenta',
      };
    }
  }

  async refresh(userId: string, refreshToken: string): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const token = await this.refreshRepository.findOne({
        where: { id: refreshToken, accountId: userId }
      });

      if (!token) {
        return { success: false, message: 'Token inválido', code: 400 };
      }

      if (token.expiredAt.getTime() < Date.now()) {
        await this.refreshRepository.delete({ id: refreshToken });
        return { success: false, message: 'Token expirado', code: 400 };
      }

      const acc = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('meta.status', 'status')
        .where('account.id = UUID_TO_BIN(:id)', { id: userId })
        .getOne();

      if (!acc) {
        return { success: false, message: 'Cuenta no encontrada', code: 404 };
      }

      if (acc.meta.status.slug === 'banned') {
        return { success: false, message: 'Cuenta suspendida temporalmente', code: 403 };
      }

      const partial = PartialAccountDto.fromEntity(acc);
      const newToken = await this.generateJwt(partial);

      await this.refreshRepository.delete({ id: refreshToken });

      await this.saveToken(userId, newToken);

      partial.refreshToken = newToken;

      return { success: true, data: partial };

    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al conectar con la base de datos de cuenta',
      };
    }
  }

  async addAccount(dto: CreateAdminDto | CreateBusinessDto | CreateUserDto): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const existing = await this.accountRepository
        .createQueryBuilder('acc')
        .where('acc.email = :email OR acc.username = :username', {
          email: dto.email,
          username: dto.username,
        })
        .getOne();

      if (existing) return { success: false, message: 'El email o usuario ya está en uso', code: 400 };

      const role = await this.accountRepository.manager
        .getRepository(Role)
        .createQueryBuilder('role')
        .where('role.slug = :slug', { slug: dto.role })
        .getOne();

      if (!role) return { success: false, message: `Rol ${dto.role} no encontrado`, code: 500 };

      let accountId: string;
      await this.accountRepository.manager.transaction(async manager => {
        const hashed = await this.hashPassword(dto.password);
        const account = manager.create(Account, {
          username: dto.username,
          email: dto.email,
          password: hashed,
        });
        await manager.save(account);
        accountId = account.id;

        await manager.insert(Meta, {
          accountId: account.id,
          roleId: role.id
        });

        if (getRoleGroup(dto.role) === 'admin' && 'publicName' in dto) {
          await manager.insert(AdminProfile, {
            accountId: account.id,
            publicName: dto.publicName
          });
        } else if (getRoleGroup(dto.role) === 'business' && 'title' in dto) {
          await manager.insert(BusinessProfile, {
            accountId: account.id,
            title: dto.title,
            bio: dto.bio ?? null,
            phone: dto.phone,
            contactEmail: dto.contactEmail ?? dto.email
          });
        } else if (getRoleGroup(dto.role) === 'user' && 'firstname' in dto) {
          await manager.insert(UserProfile, {
            accountId: account.id,
            firstname: dto.firstname,
            lastname: dto.lastname,
            birth: dto.birth ? new Date(dto.birth) : null,
            phone: dto.phone ?? null
          });
        }
      });

      const accountEntity = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('meta.status', 'status')
        .where('account.id = UUID_TO_BIN(:id)', { id: accountId! })
        .getOne();

      if(!accountEntity){
        return { success: false, message: 'Error al buscar el usuario', code: 455 };
      }
      const partial = PartialAccountDto.fromEntity(accountEntity);
      const refreshToken = await this.generateJwt(partial);
      await this.saveToken(accountId!, refreshToken);
      partial.refreshToken = refreshToken;

      return { success: true, data: partial };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.message.includes('account.email')) {
          return { success: false, message: 'El email ya está en uso', code: 400 };
        }
        if (err.message.includes('account.username')) {
          return { success: false, message: 'El username ya está en uso', code: 400 };
        }
        if (err.message.includes('admin_profile.public_name')) {
          return { success: false, message: 'El publicName ya está en uso', code: 400 };
        }
      }
      return { success: false, code: 500, message: err.message ?? 'Error al crear cuenta' };
    }
  }

  async getInfo(accountId: string): Promise<SuccessDto<AccountDto>> {
    try {
      const account = await this.getAccount(accountId);
      if(!account.success){
        return {success: account.success, code: account.code, message: account.message};
      }
      const accountDto = AccountDto.fromEntity(account.data!);

      return { success: true, data: accountDto };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener la información de la cuenta',
      };
    }
  }

  async updateAccount(accountId: string, dto: UpdateAdminDto | UpdateBusinessDto | UpdateUserDto, role: ERole): Promise<SuccessDto<AccountDto>> {
    try {
      const current = await this.getAccount(accountId);
      if (!current.success) {
        return { success: current.success, code: current.code, message: current.message };
      }
      const account = current.data!;

      let mergedAccount = {};
      if(dto.email || dto.username || dto.password) {
        mergedAccount = {
          email: dto.email ?? account.email,
          username: dto.username ?? account.username,
          password: dto.password ? await this.hashPassword(dto.password) : account.password,
        }
      };

      let mergedProfile = {};
      if (getRoleGroup(role) === 'admin' && 'publicName' in dto){
        if(!account.adminProfile) {
          throw new Error('ACCOUNT_ERROR');
        }
        if(dto.publicName){
          mergedProfile = {
            publicName: dto.publicName ?? account.adminProfile.publicName,
          };  
        }
      }else if (getRoleGroup(role) === 'business') {
        if(!account.businessProfile) {
          throw new Error('ACCOUNT_ERROR');
        }
        const b = dto as UpdateBusinessDto
        if (b.title || 'bio' in b || b.phone || b.contactEmail) {
          mergedProfile  = {
            title: b.title ?? account.businessProfile.title,
            bio: b.bio ?? account.businessProfile.bio,
            phone: b.phone ?? account.businessProfile.phone,
            contactEmail: b.contactEmail ?? account.businessProfile.contactEmail
          };
        }
      }else if (getRoleGroup(role) === 'user') {
        if(!account.userProfile) {
          throw new Error('ACCOUNT_ERROR');
        }
        const u = dto as UpdateUserDto;
        if(u.firstname || u.lastname || 'birth' in u || 'phone' in u ){
          let newBirth = u.birth ? new Date(u.birth) : account.userProfile?.birth;
          if(u.birth === "") {
            newBirth = null;
          }
          mergedProfile = {
            firstname: u.firstname ?? account.userProfile?.firstname,
            lastname: u.lastname ?? account.userProfile?.lastname,
            birth: newBirth,
            phone: u.phone ?? account.userProfile?.phone
          };
        }
      }

      if (Object.keys(mergedAccount).length === 0 && Object.keys(mergedProfile).length === 0) {
        return { success: false, code: 400, message: "No hay cambios para aplicar" };
      }

      await this.accountRepository.manager.transaction(async manager => {
        if (Object.keys(mergedAccount).length > 0) {
          await manager
            .createQueryBuilder()
            .update(Account)
            .set({
              ...mergedAccount
            })
            .where('id = UUID_TO_BIN(:id)', { id: accountId })
            .execute();
        }
        if (Object.keys(mergedProfile).length > 0) {
          switch (getRoleGroup(role)){
            case 'user':
              await manager
                .createQueryBuilder()
                .update(UserProfile)
                .set({
                  ...mergedProfile
                })
                .where('account_id =  UUID_TO_BIN(:id)', { id: accountId })
                .execute();
              break;
            case 'business':
              await manager
                .createQueryBuilder()
                .update(BusinessProfile)
                .set({
                  ...mergedProfile
                })
                .where('account_id =  UUID_TO_BIN(:id)', { id: accountId })
                .execute();
              break;
            case 'admin':
              await manager
                .createQueryBuilder()
                .update(AdminProfile)
                .set({
                  ...mergedProfile
                })
                .where('account_id =  UUID_TO_BIN(:id)', { id: accountId })
                .execute();
              break;
          }
        }
      });
      return await this.getInfo(accountId);
    } catch (err) {
      if(err.message === 'ACCOUNT_ERROR'){
        return { success: false, code: 409, message: 'Error grave en su cuenta, contacte a soporte'};
      }
      return { success: false, code: 500, message: err.message ?? 'Error al actualizar la cuenta' };
    }
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<SuccessDto<AddressDto[]>> {
    try {
      const account = await this.accountRepository.findOne({ where: { id: userId } });
      if (!account) {
        return { success: false, message: 'Cuenta no encontrada', code: 404 };
      }

      const addresses = await this.accountRepository.manager.transaction(async manager => {
        const address = manager.create(Address, {
          account: { id: userId },
          address: dto.address,
          apartment: dto.apartment ?? null,
          city: dto.city,
          zip: dto.zip,
          country: dto.country
        });

        await manager.save(address);

        return manager
          .getRepository(Address)
          .createQueryBuilder('address')
          .where('address.account_id =  UUID_TO_BIN(:id)', { id: userId })
          .getMany();
      });

      return { success: true, data: addresses.map(AddressDto.fromEntity) };
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al agregar dirección' };
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.accountRepository.manager
        .getRepository(Address)
        .createQueryBuilder()
        .delete()
        .where('id =  UUID_TO_BIN(:addressId)', { addressId })
        .andWhere('account_id =  UUID_TO_BIN(:userId)', { userId })
        .execute();

      if (result.affected === 0) {
        return { success: false, message: 'Dirección no encontrada o no pertenece al usuario', code: 404 };
      }

      return { success: true, message: 'Dirección eliminada correctamente' };
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al eliminar dirección' };
    }
  }

  async addStore(userId: string, dto: CreateStoreDto): Promise<SuccessDto<StoreDto[]>> {
    try {
      const account = await this.accountRepository.findOne({ where: { id: userId } });
      if (!account) {
        return { success: false, message: 'Cuenta no encontrada', code: 404 };
      }

      const stores = await this.accountRepository.manager.transaction(async manager => {
        const store = manager.create(Store, {
          account: {id: userId},
          phone: dto.phone,
          verified: true
        });
        await manager.save(store);

        const address = manager.create(Address, {
          storeId: store.id,
          address: dto.address,
          apartment: dto.apartment ?? null,
          city: dto.city,
          zip: dto.zip,
          country: dto.country
        });
        await manager.save(address);

        return manager
          .getRepository(Store)
          .createQueryBuilder('store')
          .leftJoinAndSelect('store.address', 'address')
          .where('store.account_id =  UUID_TO_BIN(:userId)', { userId })
          .getMany();
      });

      return { success: true, data: stores.map(StoreDto.fromEntity) };
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al agregar tienda' };
    }
  }

  async deleteStore(userId: string, storeId: string): Promise<SuccessDto<void>> {
    try {
      await this.accountRepository.manager.transaction(async manager => {
        const store = await manager
          .getRepository(Store)
          .createQueryBuilder('store')
          .where('store.id =  UUID_TO_BIN(:storeId)', { storeId })
          .andWhere('store.account_id =  UUID_TO_BIN(:userId)', { userId })
          .getOne();

        if (!store) {
          throw new Error('NOT_FOUND');
        }

        await manager
          .getRepository(Store)
          .createQueryBuilder()
          .delete()
          .where('id =  UUID_TO_BIN(:storeId)', { storeId })
          .execute();
      });

      return { success: true, message: 'Tienda eliminada correctamente' };
    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err.message ?? 'Error al eliminar la tienda'
      };
    }
  }

  async deleteAccount(accountId: string, password: string): Promise<SuccessDto<void>> {
    try {
      const account = await this.getAccount(accountId);
      if(!account.success){
        return {success: account.success, code: account.code, message: account.message};
      }

      const valid = await compare(password, account.data!.password);
      if (!valid){
        return { success: false, message: 'Credenciales inválidas', code: 400 };
      }

      await this.accountRepository
      .createQueryBuilder()
      .update(Meta)
      .set({
        deleted: new Date(),
        deletedBy: accountId
      })
      .where('account_id =  UUID_TO_BIN(:id)', { id: accountId })
      .execute();

      return {success: true, message: 'Cuenta eliminada'};
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al eliminar la cuenta' };
    }
  }

  async getBanned(adminId: string, limit?: number): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      const account = await this.getAccount(adminId);
      if(!account.success){
        return {success: account.success, code: account.code, message: account.message};
      }
      if(account.data?.meta.role.slug !== 'admin'){
        return {success: false, code: 403, message: "Acceso denegado: se requiere rol de administrador."};
      }
      const accounts = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.status', 'status')
        .leftJoinAndSelect('meta.role', 'role')
        .where('status.slug = :slug', { slug: 'banned' })
        .orderBy('meta.deleted', 'DESC')
        .limit(limit ?? 30)
        .getMany();

      return {
        success: true,
        data: accounts.map(acc => PartialAccountDto.fromEntity(acc)),
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err.message ?? 'Error al obtener cuentas baneadas',
      };
    }
  }

  async changeBannedStatus(adminId: string, userUsername: string): Promise<SuccessDto<void>> {
    try {
      const admin = await this.accountRepository.findOne({
        where: { id: adminId },
        relations: ['meta', 'meta.role']
      });

      if (!admin) {
        return { success: false, message: 'El adminId no corresponde a ningún usuario.', code: 404 };
      }

      if (admin.meta.role.slug !== 'admin') {
        return { success: false, message: 'No tenés permisos para realizar esta acción.', code: 401 };
      }

      const user = await this.accountRepository.findOne({
        where: { username: userUsername },
        relations: ['meta', 'meta.status']
      });

      if (!user) {
        return { success: false, message: 'El usuario que querés banear no existe.', code: 400 };
      }

      if (user.meta.status.slug === 'banned') {
        user.meta.deleted = null;
        user.meta.deletedBy = null;

        await this.accountRepository.manager.getRepository(Meta).save(user.meta);

        return {
        success: true,
        message: `El usuario ${user.username} fue desbaneado correctamente.`
      };
      }else{
        user.meta.deleted = new Date();
        user.meta.deletedBy = adminId;

        await this.accountRepository.manager.getRepository(Meta).save(user.meta);

        return {
        success: true,
        message: `El usuario ${user.username} fue baneado correctamente.`
      };
      }
    } catch (err) {
      return {
        success: false,
        message: err.message ?? 'Error al banear usuario.',
        code: 500
      };
    }
  }

  async userList(adminId: string, offset?: number, limit?: number): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      const account = await this.getAccount(adminId);
      if(!account.success){
        return {success: account.success, code: account.code, message: account.message};
      }
      if(account.data?.meta.role.slug !== 'admin'){
        return {success: false, code: 403, message: "Acceso denegado: se requiere rol de administrador."};
      }
      const users = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.meta', 'meta')
      .leftJoinAndSelect('meta.status', 'status')
      .leftJoinAndSelect('meta.role', 'role')
      .where('status.slug != :slug', { slug: 'banned' })
      .orderBy('account.createdAt', 'DESC')
      .offset(offset ?? 0)
      .limit(limit ?? 30)
      .getMany();

      return {
        success: true,
        data: users.map(acc => PartialAccountDto.fromEntity(acc)),
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err.message ?? 'Error al obtener la lista de usuarios',
      };
    }
  }

  async search(adminId: string, contain: string): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      const account = await this.getAccount(adminId);
      if(!account.success){
        return {success: account.success, code: account.code, message: account.message};
      }
      if(account.data?.meta.role.slug !== 'admin'){
        return {success: false, code: 403, message: "Acceso denegado: se requiere rol de administrador."};
      }
      const term = `%${contain}%`;

      const users = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.status', 'status')
        .leftJoinAndSelect('meta.role', 'role')
        .where('account.username LIKE :term', { term })
        .orWhere('account.email LIKE :term', { term })
        .orWhere('admin.publicName LIKE :term', { term })
        .orWhere('user.firstname LIKE :term', { term })
        .orWhere('user.lastname LIKE :term', { term })
        .orWhere('business.title LIKE :term', { term })
        .orWhere('business.bio LIKE :term', { term })
        .orderBy('account.createdAt', 'DESC')
        .limit(50)
        .getMany();

      return {
        success: true,
        data: users.map(acc => PartialAccountDto.fromEntity(acc))
      };

    } catch (err: any) {
      return {
        success: false,
        message: err.message ?? 'Error al realizar la busqueda.',
        code: 500
      };
    }
  }

  async getAccountInfo(adminId: string, username: string): Promise<SuccessDto<AccountDto>> {
    try{
      if(adminId !== String(process.env.INTERNAL_PASSWORD)){
        const account = await this.getAccount(adminId);
        if(!account.success){
          return {success: account.success, code: account.code, message: account.message};
        }
        if(account.data?.meta.role.slug !== 'admin'){
          return {success: false, code: 403, message: "Acceso denegado: se requiere rol de administrador."};
        }
      }
      const result = await this.accountRepository
        .createQueryBuilder('account')
        .select('account.id', 'id')
        .where('account.username = :username', { username })
        .getRawOne<{ id: string }>();

      if (!result) {
        return {success: false, message:'Usuario no encontrado' , code: 404};
      }

      return this.getInfo(result.id);
    }catch(err){
      return {
        success: false,
        message: err.message ?? 'Error obteniendo los datos.',
        code: 500
      };
    }
  }

  async getAccountListInfo(accounts: string[]): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      if (!accounts.length) {
        return { success: true, data: [] };
      }

      const ids = accounts.map(id => uuidTransformer.to(id));

      const users = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.status', 'status')
        .leftJoinAndSelect('meta.role', 'role')
        .where('account.id IN (:...ids)', { ids })
        .getMany();

      return {
        success: true,
        data: users.map(acc => PartialAccountDto.fromEntity(acc)),
      };
    } catch (err) {
      return {
        success: false,
        message: err.message ?? 'Error obteniendo los datos.',
        code: 500,
      };
    }
  }
}
