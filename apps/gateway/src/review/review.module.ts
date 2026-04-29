import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ReviewService } from "./review.service";
import { ReviewController } from "./review.controller";

@Module({
    imports: [
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
            }
        ]),
    ],
    providers: [ReviewService],
    controllers: [ReviewController],
})
export class ReviewModule {}