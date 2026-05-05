import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { AccountModule } from "../account/account.module";

@Module({
    imports: [
        AccountModule
    ],
    providers: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}