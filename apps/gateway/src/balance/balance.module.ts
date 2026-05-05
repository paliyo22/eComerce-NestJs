import { BalanceController } from "./balance.controller";
import { BalanceService } from "./balance.service";
import { Module } from "@nestjs/common";

@Module({
    providers: [BalanceService],
    controllers: [BalanceController],
})
export class BalanceModule {}