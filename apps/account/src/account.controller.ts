import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PartialAccountDto } from 'libs/dtos/acount/partial-account';

import { SuccessDto } from 'libs/shared/respuesta';
import { CreateAdminDto } from 'libs/dtos/acount/createAdmin';
import { AccountDto, CreateBussinessDto, CreateUserDto, UpdateBussinessDto, UpdateUserDto } from 'libs/dtos/acount';
import { UpdateAdminDto } from 'libs/dtos/acount/update-admin';
import { AddressDto, CreateAddressDto } from 'libs/dtos/address';
import { CreateStoreDto, StoreDto } from 'libs/dtos/store';


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

  @MessagePattern({ cmd: 'add_admin' })
  async addAdmin(@Payload() data: { account: CreateAdminDto }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.addAccount(data.account);
  }

  @MessagePattern({ cmd: 'add_business' })
  async addBusiness(@Payload() data: { account: CreateBussinessDto }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.addAccount(data.account);
  }

  @MessagePattern({ cmd: 'add_user' })
  async addUser(@Payload() data: { account: CreateUserDto }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.addAccount(data.account);
  }

  @MessagePattern({ cmd: 'get_info' })
  async getInfo(@Payload() data: { userId: string }): Promise<SuccessDto<AccountDto>> {
    return this.accountService.getInfo(data.userId);
  }

  @MessagePattern({ cmd: 'update_admin' })
  async updateAdmin(@Payload() data: { userId: string, account: UpdateAdminDto }): Promise<SuccessDto<AccountDto>> {
    return this.accountService.updateAdmin(data.userId, data.account);
  }

  @MessagePattern({ cmd: 'update_business' })
  async updateBusiness(@Payload() data: { userId: string, account: UpdateBussinessDto }): Promise<SuccessDto<AccountDto>> {
    return this.accountService.updateBusiness(data.userId, data.account);
  }

  @MessagePattern({ cmd: 'update_user' })
  async updateUser(@Payload() data: { userId: string, account: UpdateUserDto }): Promise<SuccessDto<AccountDto>> {
    return this.accountService.updateUser(data.userId, data.account);
  }

  @MessagePattern({ cmd: 'add_address' })
  async addAddress(@Payload() data: { userId: string, address: CreateAddressDto }): Promise<SuccessDto<AddressDto[]>> {
    return this.accountService.addAddress(data.userId, data.address);
  }

  @MessagePattern({ cmd: 'delete_address' })
  async deleteAddress(@Payload() data: { userId: string, addressId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteAddress(data.userId, data.addressId);
  }

  @MessagePattern({ cmd: 'add_store' })
  async addStore(@Payload() data: { userId: string, store: CreateStoreDto }): Promise<SuccessDto<StoreDto[]>> {
    return this.accountService.addStore(data.userId, data.store);
  }

  @MessagePattern({ cmd: 'delete_store' })
  async deleteStore(@Payload() data: { userId: string, storeId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteStore(data.userId, data.storeId);
  }

  @MessagePattern({ cmd: 'get_banned_list' })
  async getBanned(): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.getBanned();
  }

  @MessagePattern({ cmd: 'ban_unban' })
  async changeBannedStatus(@Payload() data: {adminId: string, userUsername: string}): Promise<SuccessDto<void>> {
    return this.accountService.changeBannedStatus(data.adminId, data.userUsername);
  }

  @MessagePattern({ cmd: 'get_user_list' })
  async userList(@Payload() data:{offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.userList(data.offset, data.limit);
  }

  
}
