import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { SuccessDto, PartialAccountDto, AddressDto, CreateAddressDto, 
  CreateStoreDto, StoreDto, AccountDto, AccountOutputDto, PartialAccountOutputDto, 
  CreateAccountDto, UpdateAccountDto, WithdrawalDto, TransactionDto, 
  IncomeDto} from '@app/lib';
import { PublicAccountDto } from '@app/lib/dtos/api/account/publicAccountDto';
import { GeneralService } from './general.service';
import { AuthService } from './auth.service';
import { AdminService } from './admin.service';
import { EventService } from './event.service';
import { AddressService } from './address.service';
import { StoreService } from './store.service';
import { BalanceService } from './balance.service';

@Controller()
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly generalService: GeneralService,
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
    private readonly eventService: EventService,
    private readonly addressService: AddressService,
    private readonly storeService: StoreService,
    private readonly balanceService: BalanceService,
  ) {}
  
  @MessagePattern({ cmd: 'log_in' })
  async logIn(@Payload() data: { account: string, password: string, ip: string, device: string}): Promise<SuccessDto<PartialAccountDto>> {
    return this.authService.logIn(data.account, data.password, data.ip, data.device);
  }

  @EventPattern('log.out')
  logOut(@Payload() data: { accountId: string, device: string }): void {
    this.authService.logOut(data.accountId, data.device);
  }

  @MessagePattern({ cmd: 'refresh' })
  async refresh(@Payload() data: { accountId: string, refreshToken: string, ip: string, device: string }): Promise<SuccessDto<PartialAccountDto>> {
    return this.authService.refresh(data.accountId, data.refreshToken, data.ip, data.device);
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
    return this.addressService.getAddress(data.accountId);
  }

  @MessagePattern({ cmd: 'add_address' })
  async addAddress(@Payload() data: { accountId: string, address: CreateAddressDto }): Promise<SuccessDto<AddressDto>> {
    return this.addressService.addAddress(data.accountId, data.address);
  }

  @MessagePattern({ cmd: 'delete_address' })
  async deleteAddress(@Payload() data: { accountId: string, addressId: string }): Promise<SuccessDto<void>> {
    return this.addressService.deleteAddress(data.accountId, data.addressId);
  }

  @MessagePattern({ cmd: 'get_stores' })
  async getStore(@Payload() data: { accountId: string }): Promise<SuccessDto<StoreDto[]>> {
    return this.storeService.getStores(data.accountId);
  }

  @MessagePattern({ cmd: 'add_store' })
  async addStore(@Payload() data: { accountId: string, store: CreateStoreDto }): Promise<SuccessDto<StoreDto>> {
    return this.storeService.addStore(data.accountId, data.store);
  }

  @MessagePattern({ cmd: 'delete_store' })
  async deleteStore(@Payload() data: { accountId: string, storeId: string }): Promise<SuccessDto<void>> {
    return this.storeService.deleteStore(data.accountId, data.storeId);
  }

  @MessagePattern({ cmd: 'get_balance' })
  async getBalance(@Payload() data: { accountId: string }): Promise<SuccessDto<number>> {
    return this.balanceService.getBalance(data.accountId);
  }

  @MessagePattern({ cmd: 'get_withdrawal_list' })
  async getWithdrawals(@Payload() data: { accountId: string }): Promise<SuccessDto<WithdrawalDto[]>> {
    return this.balanceService.getWithdrawals(data.accountId);
  }

  @MessagePattern({ cmd: 'get_income_list' })
  async getIncomes(@Payload() data: { accountId: string }): Promise<SuccessDto<IncomeDto[]>> {
    return this.balanceService.getIncomes(data.accountId);
  }

  @MessagePattern({ cmd: 'withdraw' })
  async withdraw(@Payload() data: { accountId: string, amount: number, token: TransactionDto }): Promise<SuccessDto<WithdrawalDto>> {
    const result = await this.generalService.check(data.token);
    if(result === 'failed')
      return { success: false, message: 'INTERNAL_ERROR', code: 500 };

    if(result === 'completed')
      return { success: true };
    return this.balanceService.withdraw(data.accountId, data.amount, data.token);
  }

  @MessagePattern({ cmd: 'get_public_account' })
  async getPublicAccount(@Payload() data:{ username: string }): Promise<SuccessDto<PublicAccountDto>> {
    return this.accountService.getPublicAccount(data.username);
  }

  @MessagePattern({ cmd: 'search_public_account' })
  async publicSearch(@Payload() data:{contains: string, limit?: number}): Promise<SuccessDto<string[]>> {
    return this.accountService.publicSearch(data.contains, data.limit);
  }

  @MessagePattern({ cmd: 'change_cbu' })
  async changeCbu(@Payload() data:{ accountId: string, password: string, newCBU: string }): Promise<SuccessDto<void>> {
    return this.accountService.changeCbu(data.accountId, data.password, data.newCBU);
  }
  //------------------ ADMIN FUNCTIONS -------------------------------
  @MessagePattern({ cmd: 'get_active_list' })
  async getAccountList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.adminService.getActiveList(data.adminId, data.offset, data.limit);
  }
  
  @MessagePattern({ cmd: 'get_banned_list' })
  async getBannedList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.adminService.getBannedList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'get_suspended_list' })
  async getSuspendedList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.adminService.getSuspendedList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'get_inactive_list' })
  async getInactiveList(@Payload() data:{adminId: string, offset?: number, limit?: number}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.adminService.getInactiveList(data.adminId, data.offset, data.limit);
  }

  @MessagePattern({ cmd: 'search_account' })
  async search(@Payload() data:{adminId: string, contains: string}): Promise<SuccessDto<PartialAccountOutputDto[]>> {
    return this.adminService.search(data.adminId, data.contains);
  }

  @MessagePattern({ cmd: 'get_account_info' })
  async getAccountInfo(@Payload() data:{adminId: string, username: string}): Promise<SuccessDto<AccountOutputDto>> {
    return this.adminService.getAccountInfo(data.adminId, data.username);
  }

  @MessagePattern({ cmd: 'create_admin' })
  async createAdmin(@Payload() data:{adminId: string, account: CreateAccountDto}): Promise<SuccessDto<void>> {
    return this.adminService.addAdmin(data.adminId, data.account);
  }

  @MessagePattern({ cmd: 'ban_account' })
  async banAccount(@Payload() data: {adminId: string, username: string}): Promise<SuccessDto<void>> {
    return this.adminService.banAccount(data.adminId, data.username);
  }

  @MessagePattern({ cmd: 'unban_account' })
  async restoreAccount(@Payload() data: {adminId: string, username: string}): Promise<SuccessDto<void>> {
    return this.adminService.restoreAccount(data.adminId, data.username);
  }

  @MessagePattern({ cmd: 'suspend_account' })
  async suspendAccount(@Payload() data: {adminId: string, username: string}): Promise<SuccessDto<void>> {
    return this.adminService.suspendAccount(data.adminId, data.username);
  }
  
  //------------------ EVENT FUNCTIONS -------------------------------
  // se invoca en: Product/getProductById
  @MessagePattern({ cmd: 'get_account_list_info' })
  async getAccountListInfo(@Payload() data:{ accountIds: string[] }): Promise<SuccessDto<AccountDto[]>> {
    return this.eventService.getAccountListInfo(data.accountIds);
  }

  // se invoca en: Product/addReview
  @MessagePattern({ cmd: 'get_partial_account_list_info' })
  async getPartialAccountListInfo(@Payload() data:{ accountIds: string[] }): Promise<SuccessDto<PartialAccountDto[]>> {
    return this.eventService.getPartialAccountListInfo(data.accountIds);
  }

  // se invoca en: Order/setOrder
  @MessagePattern({ cmd: 'add_to_account_balance' })
  async addToBalance(@Payload() data:{ accounts: {accountId: string, balance: number, orderId: string}[], token: TransactionDto }): Promise<void>{
    if(data.token){
      const result = await this.generalService.check(data.token);
      if(result === 'failed')
        return;

      if(result === 'completed')
        return;
    };
    return this.eventService.addToBalance(data.accounts, data.token);
  }

  @MessagePattern({ cmd: 'is_admin' })
  async isAdmin(@Payload() data:{ adminId: string }): Promise<SuccessDto<void>> {
    return this.eventService.isAdmin(data.adminId);
  }







  //---------------------- Initial load for TESTING ---------------------------------
  @MessagePattern({ cmd: 'testing_load' })
  async loadDefaultAccounts(@Payload() data:{ accounts: CreateAccountDto[] }): Promise<SuccessDto<string[]>> {
    return this.accountService.loadDefaultAccounts(data.accounts);
  }
}
