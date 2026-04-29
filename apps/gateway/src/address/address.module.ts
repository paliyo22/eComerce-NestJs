import { ClientsModule, Transport } from "@nestjs/microservices";
import { AddressController } from "./address.controller";
import { AddressService } from "./address.service";
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
    providers: [AddressService],
    controllers: [AddressController],
})
export class AddressModule {}