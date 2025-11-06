import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { CreateProductDto } from "libs/dtos/product/createProduct";


@Injectable()
export class ProductService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy
    ) {};

    async createProduct(dto: CreateProductDto, userId: string) {
        return this.productClient.send(
            { cmd: 'create_product' },
            { ...dto, userId }
        );
    };

    async getProductById(id: string) {
        return this.productClient.send(
            { cmd: 'get_product_by_id' },
            { id }
        );
    };
}