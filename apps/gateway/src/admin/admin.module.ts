import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { AccountModule } from "../account/account.module";

@Module({
    imports: [
        AccountModule,
        ClientsModule.register([
            {
                name: 'PRODUCT_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://rabbitmq:5672'],
                    queue: 'product_queue',
                    queueOptions: {
                        durable: false
                    }
                }
            },
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
    providers: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}