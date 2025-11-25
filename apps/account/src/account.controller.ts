import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';
import { SuccessDto } from 'libs/shared/respuesta';
import { UpdateAdminDto } from 'libs/dtos/acount/update-admin';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';
import { AccountDto, CreateAdminDto, CreateBusinessDto, CreateUserDto, UpdateBusinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { ERole } from 'libs/shared/role-enum';


@Controller()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  
  @MessagePattern({ cmd: 'log_in' })
  async logIn(@Payload() data: { account: string, password: string }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.logIn(data.account, data.password);
  }

  @MessagePattern({ cmd: 'log_out' })
  async logOut(@Payload() data: { userId: string }): Promise<SuccessDto<void>> {
    return this.accountService.logOut(data.userId);
  }

  @MessagePattern({ cmd: 'refresh' })
  async refresh(@Payload() data: { userId: string, refreshToken: string }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.refresh(data.userId, data.refreshToken);
  }

  @MessagePattern({ cmd: 'get_info' })
  async getInfo(@Payload() data: { userId: string }): Promise<SuccessDto<AccountDto>> {
    return this.accountService.getInfo(data.userId);
  }

  @MessagePattern({ cmd: 'add_account' })
  async addAccount(@Payload() data: { account: CreateUserDto | CreateAdminDto | CreateBusinessDto }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.addAccount(data.account);
  }

  @MessagePattern({ cmd: 'update_account' })
  async updateAccount(@Payload() data: { 
    accountId: string, 
    account: UpdateAdminDto | UpdateBusinessDto | UpdateUserDto,
    role: ERole
   }
  ): Promise<SuccessDto<AccountDto>> {
    return this.accountService.updateAccount(data.accountId, data.account, data.role);
  }

  @MessagePattern({ cmd: 'add_address' })
  async addAddress(@Payload() data: { accountId: string, address: CreateAddressDto }): Promise<SuccessDto<AddressDto[]>> {
    return this.accountService.addAddress(data.accountId, data.address);
  }

  @MessagePattern({ cmd: 'delete_address' })
  async deleteAddress(@Payload() data: { accountId: string, addressId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteAddress(data.accountId, data.addressId);
  }

  @MessagePattern({ cmd: 'add_store' })
  async addStore(@Payload() data: { accountId: string, store: CreateStoreDto }): Promise<SuccessDto<StoreDto[]>> {
    return this.accountService.addStore(data.accountId, data.store);
  }

  @MessagePattern({ cmd: 'delete_store' })
  async deleteStore(@Payload() data: { accountId: string, storeId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteStore(data.accountId, data.storeId);
  }

  @MessagePattern({ cmd: 'delete_account' })
  async deleteAccount(@Payload() data: { accountId: string, password: string}): Promise<SuccessDto<void>> {
    return this.accountService.deleteAccount(data.accountId, data.password);
  }

  @MessagePattern({ cmd: 'get_banned_list' })
  async getBanned(@Payload() data:{adminId: string, limit?: number}): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.getBanned(data.adminId, data.limit);
  }

  @MessagePattern({ cmd: 'ban_unban' })
  async changeBannedStatus(@Payload() data: {adminId: string, username: string}): Promise<SuccessDto<void>> {
    return this.accountService.changeBannedStatus(data.adminId, data.username);
  }

  @MessagePattern({ cmd: 'get_account_list' })
  async userList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.userList(data.adminId, data.offset, data.limit);
  }
  
  @MessagePattern({ cmd: 'search_account' })
  async search(@Payload() data:{adminId: string, contain: string}): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.search(data.adminId, data.contain);
  }

  @MessagePattern({ cmd: 'get_account_info' })
  async getAccountInfo(@Payload() data:{adminId: string, username: string}): Promise<SuccessDto<AccountDto>> {
    return this.accountService.getAccountInfo(data.adminId, data.username);
  }

}
