import { Injectable } from '@nestjs/common';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { sign } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Account, Address, AdminProfile, BusinessProfile, Meta, RefreshToken, Role, Store, UserProfile } from 'libs/entities/users';
import { Repository } from 'typeorm';
import { compare, hash, genSalt } from 'bcrypt';
import { AccountDto, CreateBussinessDto, CreateUserDto, UpdateBussinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { CreateAdminDto } from 'libs/dtos/acount/createAdmin';
import { UpdateAdminDto } from 'libs/dtos/acount/update-admin';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepository: Repository<RefreshToken>,
  ) {}

  private async hashPassword(raw: string): Promise<string> {
    const salt = await genSalt(Number(process.env.SALT));
    return hash(raw, salt);
  }

  private async generateJwt(account: PartialAccountDto): Promise<string> {
    const payload = { userId: account.id };
    return sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '1d' });
  }

  private async saveToken(accountId: string, refreshToken: string): Promise<void> {
    const entity = this.refreshRepository.create({
      id: refreshToken,
      accountId,
      device: 'unknown',
      ip: 'unknown',
      expiredAt: new Date(Date.now() + 86400000)
    });

    await this.refreshRepository.save(entity);
  }

  async logIn(account: string, password: string): Promise<SuccessDto<PartialAccountDto>> {
    try {
      const acc = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .where('account.email = :acc OR account.username = :acc', { acc: account })
        .getOne();

      if (!acc){
        return { success: false, message: 'Cuenta no encontrada', code: 400 };
      }

      if (acc.meta.status.name === 'banned') {
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

      const result = PartialAccountDto.fromEntity(acc,'');
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
        .where('account_id = :id', { id: userId })
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
        .where('account.id = :id', { id: userId })
        .getOne();

      if (!acc) {
        return { success: false, message: 'Cuenta no encontrada', code: 404 };
      }

      const partial = PartialAccountDto.fromEntity(acc, '');
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

  async addAccount(dto: CreateAdminDto | CreateBussinessDto | CreateUserDto): Promise<SuccessDto<PartialAccountDto>> {
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
          roleId: role.id,
          deletedBy: null
        });

        if (dto.role === 'admin' && 'publicName' in dto) {
          await manager.insert(AdminProfile, {
            accountId: account.id,
            publicName: dto.publicName
          });
        } else if (dto.role === 'business' && 'title' in dto) {
          await manager.insert(BusinessProfile, {
            accountId: account.id,
            title: dto.title,
            bio: dto.bio ?? null,
            phone: dto.phone,
            contactEmail: dto.contactEmail ?? dto.email
          });
        } else if (dto.role === 'user' && 'firstname' in dto) {
          await manager.insert(UserProfile, {
            accountId: account.id,
            firstname: dto.firstname,
            lastname: dto.lastname,
            birth: dto.birth ? new Date(dto.birth) : null,
            phone: dto.phone ?? null
          });
        }
      });

      const accountEntity = await this.accountRepository.findOne({ where: { id: accountId! } });
      const partial = PartialAccountDto.fromEntity(accountEntity!, '');
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

  async getInfo(userId: string): Promise<SuccessDto<AccountDto>> {
    try {
      const account = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoinAndSelect('account.meta', 'meta')
        .leftJoinAndSelect('meta.role', 'role')
        .leftJoinAndSelect('account.userProfile', 'userProfile')
        .leftJoinAndSelect('account.businessProfile', 'businessProfile')
        .leftJoinAndSelect('account.adminProfile', 'adminProfile')
        .leftJoinAndSelect('account.stores', 'store')
        .leftJoinAndSelect('store.address', 'storeAddress')
        .leftJoinAndSelect('account.addresses', 'address')
        .where('account.id = :id', { id: userId })
        .getOne();

      if (!account) {
        return { success: false, message: 'Cuenta no encontrada', code: 404 };
      }

      const accountDto = AccountDto.fromEntity(account);

      return { success: true, data: accountDto };
    } catch (err) {
      return {
        success: false,
        code: 500,
        message: err?.message ?? 'Error al obtener la información de la cuenta',
      };
    }
  }

  async updateAdmin(userId: string, dto: UpdateAdminDto): Promise<SuccessDto<AccountDto>> {
    try {
      await this.accountRepository.manager.transaction(async manager => {
        if (dto.password) {
          dto.password = await this.hashPassword(dto.password);
        }

        if (dto.email || dto.username || dto.password) {
          await manager
            .createQueryBuilder()
            .update(Account)
            .set({
              email: dto.email,
              username: dto.username,
              password: dto.password,
            })
            .where('id = :id', { id: userId })
            .execute();
        }

        if (dto.publicName) {
          await manager
            .createQueryBuilder()
            .update(AdminProfile)
            .set({ publicName: dto.publicName })
            .where('account_id = :id', { id: userId })
            .execute();
        }
      });

      const updated = await this.getInfo(userId);
      return updated;
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al actualizar admin' };
    }
  }

  async updateBusiness(userId: string, dto: UpdateBussinessDto): Promise<SuccessDto<AccountDto>> {
    try {
      await this.accountRepository.manager.transaction(async manager => {
        if (dto.password) {
          dto.password = await this.hashPassword(dto.password);
        }

        if (dto.email || dto.username || dto.password) {
          await manager
            .createQueryBuilder()
            .update(Account)
            .set({
              email: dto.email,
              username: dto.username,
              password: dto.password,
            })
            .where('id = :id', { id: userId })
            .execute();
        }

        const profileUpdate: Partial<BusinessProfile> = {};
        if (dto.title) profileUpdate.title = dto.title;
        if (dto.bio !== undefined) profileUpdate.bio = dto.bio;
        if (dto.phone) profileUpdate.phone = dto.phone;
        if (dto.contactEmail) profileUpdate.contactEmail = dto.contactEmail;

        if (Object.keys(profileUpdate).length > 0) {
          await manager
            .createQueryBuilder()
            .update(BusinessProfile)
            .set(profileUpdate)
            .where('account_id = :id', { id: userId })
            .execute();
        }
      });

      const updated = await this.getInfo(userId);
      return updated;
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al actualizar business' };
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto): Promise<SuccessDto<AccountDto>> {
    try {
      await this.accountRepository.manager.transaction(async manager => {
        if (dto.password) {
          dto.password = await this.hashPassword(dto.password);
        }

        if (dto.email || dto.username || dto.password) {
          await manager
            .createQueryBuilder()
            .update(Account)
            .set({
              email: dto.email,
              username: dto.username,
              password: dto.password,
            })
            .where('id = :id', { id: userId })
            .execute();
        }

        const profileUpdate: Partial<UserProfile> = {};
        if (dto.firstname) profileUpdate.firstname = dto.firstname;
        if (dto.lastname) profileUpdate.lastname = dto.lastname;
        if (dto.birth) profileUpdate.birth = new Date(dto.birth);
        if (dto.phone) profileUpdate.phone = dto.phone;

        if (Object.keys(profileUpdate).length > 0) {
          await manager
            .createQueryBuilder()
            .update(UserProfile)
            .set(profileUpdate)
            .where('account_id = :id', { id: userId })
            .execute();
        }
      });

      const updated = await this.getInfo(userId);
      return updated;
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al actualizar user' };
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<SuccessDto<void>> {
    try {
      const result = await this.accountRepository.manager
        .getRepository(Address)
        .createQueryBuilder()
        .delete()
        .where('id = :addressId', { addressId })
        .andWhere('account_id = :userId', { userId })
        .execute();

      if (result.affected === 0) {
        return { success: false, message: 'Dirección no encontrada o no pertenece al usuario', code: 404 };
      }

      return { success: true, message: 'Dirección eliminada correctamente' };
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al eliminar dirección' };
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
          .where('address.account_id = :id', { id: userId })
          .getMany();
      });

      return { success: true, data: addresses.map(AddressDto.fromEntity) };
    } catch (err) {
      return { success: false, code: 500, message: err.message ?? 'Error al agregar dirección' };
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
          verified: false,
        });
        await manager.save(store);

        const address = manager.create(Address, {
          storeId: store.id,
          address: dto.address,
          apartment: dto.apartment ?? null,
          city: dto.city,
          zip: dto.zip,
          country: dto.country,
        });
        await manager.save(address);

        store.address = address;

        return manager
          .getRepository(Store)
          .createQueryBuilder('store')
          .leftJoinAndSelect('store.address', 'address')
          .where('store.account_id = :userId', { userId })
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
          .where('store.id = :storeId', { storeId })
          .andWhere('store.account_id = :userId', { userId })
          .getOne();

        if (!store) {
          throw new Error('NOT_FOUND');
        }

        await manager
          .getRepository(Store)
          .createQueryBuilder()
          .delete()
          .where('id = :storeId', { storeId })
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

  async getBanned(): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      const accounts = await this.accountRepository
        .createQueryBuilder('account')
        .leftJoin('account.meta', 'meta')
        .leftJoinAndSelect('meta.status', 'status')
        .where('status.name = :name', { name: 'banned' })
        .getMany();

      return {
        success: true,
        data: accounts.map(acc => PartialAccountDto.fromEntity(acc, '')),
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

      if (user.meta.status.name === 'banned') {
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

  async userList(offset?: number, limit?: number): Promise<SuccessDto<PartialAccountDto[]>> {
    try {
      const users = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.meta', 'meta')
      .leftJoinAndSelect('meta.role', 'role')
      .orderBy('account.createdAt', 'DESC')
      .offset(offset ?? 0)
      .limit(limit ?? 30)
      .getMany();

      const data = users.map(acc => PartialAccountDto.fromEntity(acc, ''));

      return {
        success: true,
        data,
      };

    } catch (err: any) {
      return {
        success: false,
        code: 500,
        message: err.message ?? 'Error al obtener la lista de usuarios',
      };
    }
  }


}
