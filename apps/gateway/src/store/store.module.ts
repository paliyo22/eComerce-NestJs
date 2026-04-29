import { Module } from "@nestjs/common";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";
import { ClientsModule, Transport } from "@nestjs/microservices";

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
    providers: [StoreService],
    controllers: [StoreController],
})
export class StoreModule {}