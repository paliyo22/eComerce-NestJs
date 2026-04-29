import { Controller, Get, HttpCode, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { BalanceService } from "./balance.service";
import { WithdrawalDto } from "@app/lib";
import { User } from "../decorators/authGuard.decorator";
import { JwtAuthGuard } from "../guards/jwtAuth.guard";

@Controller('balance')
@UseGuards(JwtAuthGuard)
export class BalanceController {
    constructor(
        private readonly balanceService: BalanceService
    ){};

    @Get()
    async getBalance(
        @User('accountId') accountId: string
    ): Promise<number>{
        return this.balanceService.getBalance(accountId);
    };

    @Post()
    @HttpCode(201)
    async withdraw(
        @User('accountId') accountId: string,
        @Query('amount', ParseIntPipe) amount: number
    ): Promise<WithdrawalDto | void>{
        return this.balanceService.withdraw(accountId, amount);
    };

    @Get('/withdrawals')
    async withdrawalList(
        @User('accountId') accountId: string
    ): Promise<WithdrawalDto[]>{
        return this.balanceService.withdrawalList(accountId);
    }
    
}