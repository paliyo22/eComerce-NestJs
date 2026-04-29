import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";

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
        ])
    ],
    providers: [OrderService],
    controllers: [OrderController],
})
export class OrderModule {}