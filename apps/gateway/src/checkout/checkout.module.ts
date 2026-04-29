import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { CheckoutService } from "./checkout.service";
import { CheckoutController } from "./checkout.controller";

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'ORDER_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://rabbitmq:5672'],
                    queue: 'order_queue',
                    queueOptions: {
                        durable: false
                    }
                }
            }
        ]),
    ],
    providers: [CheckoutService],
    controllers: [CheckoutController],
})
export class CheckoutModule {}