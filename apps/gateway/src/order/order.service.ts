import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class OrderService {
    constructor (
            @Inject('ORDER_SERVICE') 
            private readonly orderClient: ClientProxy
        ) {};
    
}
