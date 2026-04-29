import { ClientsModule, Transport } from "@nestjs/microservices";
import { BalanceController } from "./balance.controller";
import { BalanceService } from "./balance.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [
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
    providers: [BalanceService],
    controllers: [BalanceController],
})
export class BalanceModule {}