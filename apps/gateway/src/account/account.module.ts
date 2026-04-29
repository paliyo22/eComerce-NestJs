import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AuthService } from "../auth/auth.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [
        AuthModule,
        ClientsModule.register([
            {
                name: 'ACCOUNT_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://rabbitmq:5672'],
                    queue: 'account_queue',
                    queueOptions: {
                        durable: false
                    }
                }
            }
        ]),
    ],
    providers: [AccountService],
    exports: [AccountService],
    controllers: [AccountController],
})
export class AccountModule {}