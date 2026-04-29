import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SuccessDto, PartialAccountDto, AddressDto, CreateAddressDto, 
  CreateStoreDto, StoreDto, AccountDto, AccountOutputDto, PartialAccountOutputDto, 
  CreateAccountDto, UpdateAccountDto, 
  WithdrawalDto} from '@app/lib';

@Controller()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  
  @MessagePattern({ cmd: 'log_in' })
  async logIn(@Payload() data: { account: string, password: string, ip: string, device: string}): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.logIn(data.account, data.password, data.ip, data.device);
  }

  @EventPattern('log.out')
  logOut(@Payload() data: { accountId: string, device: string }): void {
    this.accountService.logOut(data.accountId, data.device);
  }

  @MessagePattern({ cmd: 'refresh' })
  async refresh(@Payload() data: { accountId: string, refreshToken: string, ip: string, device: string }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.refresh(data.accountId, data.refreshToken, data.ip, data.device);
  }

  @MessagePattern({ cmd: 'get_info' })
  async getInfo(@Payload() data: { accountId: string }): Promise<SuccessDto<AccountOutputDto>> {
    return this.accountService.getInfo(data.accountId);
  }

  @MessagePattern({ cmd: 'add_account' })
  async addAccount(@Payload() data: {  
    account: CreateAccountDto,
    ip: string, 
    device: string 
  }): Promise<SuccessDto<PartialAccountDto>> {
    return this.accountService.addAccount(data.account, data.ip, data.device);
  }

  @MessagePattern({ cmd: 'update_account' })
  async updateAccount(@Payload() data: { 
    accountId: string, 
    account: UpdateAccountDto
   }): Promise<SuccessDto<AccountOutputDto>> {
    return this.accountService.updateAccount(data.accountId, data.account);
  }

  @MessagePattern({ cmd: 'delete_account' })
  async deleteAccount(@Payload() data: { accountId: string, password: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteAccount(data.accountId, data.password);
  }

  @MessagePattern({ cmd: 'change_password' })
  async changePassword(@Payload() data: { accountId: string, oldPassword: string, newPassword: string }): Promise<SuccessDto<void>> {
    return this.accountService.changePassword(data.accountId, data.oldPassword, data.newPassword);
  }

  @MessagePattern({ cmd: 'get_addresses' })
  async getAddress(@Payload() data: { accountId: string }): Promise<SuccessDto<AddressDto[]>> {
    return this.accountService.getAddress(data.accountId);
  }

  @MessagePattern({ cmd: 'add_address' })
  async addAddress(@Payload() data: { accountId: string, address: CreateAddressDto }): Promise<SuccessDto<AddressDto>> {
    return this.accountService.addAddress(data.accountId, data.address);
  }

  @MessagePattern({ cmd: 'delete_address' })
  async deleteAddress(@Payload() data: { accountId: string, addressId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteAddress(data.accountId, data.addressId);
  }

  @MessagePattern({ cmd: 'get_stores' })
  async getStore(@Payload() data: { accountId?: string, username?: string }): Promise<SuccessDto<StoreDto[]>> {
    return this.accountService.getStores(data.accountId, data.username);
  }

  @MessagePattern({ cmd: 'add_store' })
  async addStore(@Payload() data: { accountId: string, store: CreateStoreDto }): Promise<SuccessDto<StoreDto>> {
    return this.accountService.addStore(data.accountId, data.store);
  }

  @MessagePattern({ cmd: 'delete_store' })
  async deleteStore(@Payload() data: { accountId: string, storeId: string }): Promise<SuccessDto<void>> {
    return this.accountService.deleteStore(data.accountId, data.storeId);
  }

  @MessagePattern({ cmd: 'get_balance' })
  async getBalance(@Payload() data: { accountId: string }): Promise<SuccessDto<number>> {
    return this.accountService.getBalance(data.accountId);
  }

  @MessagePattern({ cmd: 'get_withdrawal_list' })
  async getWithdrawals(@Payload() data: { accountId: string }): Promise<SuccessDto<WithdrawalDto[]>> {
    return this.accountService.getWithdrawals(data.accountId);
  }

  @MessagePattern({ cmd: 'withdraw' })
  async withdraw(@Payload() data: { accountId: string, amount: number }): Promise<SuccessDto<WithdrawalDto>> {
    return this.accountService.withdraw(data.accountId, data.amount);
  }

  //------------------ ADMIN FUNCTIONS -------------------------------
  @MessagePattern({ cmd: 'get_active_list' })
  async getAccountList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.accountService.getActiveList(data.adminId, data.offset, data.limit);
  }
  
  @MessagePattern({ cmd: 'get_banned_list' })
  async getBannedList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.accountService.getBannedList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'get_suspended_list' })
  async getSuspendedList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.accountService.getSuspendedList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'get_inactive_list' })
  async getInactiveList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.accountService.getInactiveList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'search_account' })
  async search(@Payload() data:{adminId: string, contains: string}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.accountService.search(data.adminId, data.contains);
  }

  @MessagePattern({ cmd: 'get_account_info' })
  async getAccountInfo(@Payload() data:{password: string, username: string}): Promise<SuccessDto<AccountOutputDto>> {
    return this.accountService.getAccountInfo(data.password, data.username);
  }

  @MessagePattern({ cmd: 'create_admin' })
  async createAdmin(@Payload() data:{password: string, account: CreateAccountDto}): Promise<SuccessDto<void>> {
    return this.accountService.addAdmin(data.password, data.account);
  }

  @MessagePattern({ cmd: 'ban_account' })
  async banAccount(@Payload() data: {adminId: string, mail: string}): Promise<SuccessDto<void>> {
    return this.accountService.banAccount(data.adminId, data.mail);
  }

  @MessagePattern({ cmd: 'unban_account' })
  async restoreAccount(@Payload() data: {adminId: string, mail: string}): Promise<SuccessDto<void>> {
    return this.accountService.restoreAccount(data.adminId, data.mail);
  }

  @MessagePattern({ cmd: 'suspend_account' })
  async suspendAccount(@Payload() data: {adminId: string, mail: string}): Promise<SuccessDto<void>> {
    return this.accountService.suspendAccount(data.adminId, data.mail);
  }
  
  //------------------ EVENT FUNCTIONS -------------------------------
  // se invoca en: Product/getProductById
  @MessagePattern({ cmd: 'get_account_list_info' })
  async getAccountListInfo(@Payload() data:{ accountIds: string[] }): Promise<SuccessDto<AccountDto[]>> {
    return this.accountService.getAccountListInfo(data.accountIds);
  }

  // se invoca en: Product/addReview
  @MessagePattern({ cmd: 'get_partial_account_list_info' })
  async getPartialAccountListInfo(@Payload() data:{ accountIds: string[] }): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.accountService.getPartialAccountListInfo(data.accountIds);
  }

  // se invoca en: Order/setOrder
  @MessagePattern({ cmd: 'add_to_account_balance' })
  async addToBalance(@Payload() data:{ accounts: {accountId: string, balance: number}[] }): Promise<void>{
    return this.accountService.addToBalance(data.accounts);
  }
}
