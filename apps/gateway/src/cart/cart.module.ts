import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'CART_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://rabbitmq:5672'],
                    queue: 'cart_queue',
                    queueOptions: {
                        durable: false
                    }
                }
            }
        ])
    ],
    providers: [CartService],
    controllers: [CartController],
})
export class CartModule {}