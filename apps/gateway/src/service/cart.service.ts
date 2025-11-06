import { Injectable, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CartService {
    constructor (
        @Inject('CART_SERVICE') 
        private readonly cartClient: ClientProxy
    ) {};

}