import { EStateStatus, PartialProductDto, SuccessDto, TransactionDto, withRetry } from "@app/lib";
import { HttpException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import Redis from "ioredis";
import { firstValueFrom } from "rxjs";
import { errorManager } from "../helpers/errorManager";

@Injectable()
export class GeneralService {
    constructor(
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy,
        @Inject('REDIS_CLIENT')
        private redis: Redis
    ){}

    async transactionResult(uuid: string): Promise<EStateStatus>{
        const cacheKey = `transaction:${uuid}`;
        const cached = await this.redis.get(cacheKey).catch(() => { throw new InternalServerErrorException() });
        
        if(!cached){
            throw new HttpException('already resolved', 410);
        };

        const result = JSON.parse(cached) as TransactionDto;
        
        return result.status;
    }

    async search(contains: string, limit?: string): Promise<{ products: PartialProductDto[], accounts: string[] }>{
        try {
            const [productResult, accountResult] = await Promise.all([
                firstValueFrom(
                    this.productClient.send<SuccessDto<PartialProductDto[]>>(
                        { cmd: 'search' },
                        { contains, limit }
                    ).pipe(withRetry())
                ),
                firstValueFrom(
                    this.accountClient.send<SuccessDto<string[]>>(
                        { cmd: 'search_public_account' },
                        { contains, limit }
                    ).pipe(withRetry())
                )
            ]);

            if (!accountResult.success && !productResult.success){
                throw new HttpException('INTERNAL_ERROR', 500);
            };

            return {
                products: productResult.success ? productResult.data : [],
                accounts: accountResult.success ? accountResult.data : []
            };
        } catch (err: any) {
            throw errorManager(err, GeneralService.name);
        }
    }























    
  //---------------------- Initial load for TESTING ---------------------------------
    async getCategories(): Promise<string[]>{
        try {
            const response = await firstValueFrom(
                    this.productClient.send<SuccessDto<any>>(
                        { cmd: 'get_categories' },
                        {}
                    )
                );
            

            if (!response.success){
                throw new HttpException(response.data, response.code);
            };

            return response.data!;
        } catch (err: any) {
            throw errorManager(err, GeneralService.name);
        }
    }

    async testingLoad(): Promise<string>{
        try {
            const result = await fetch('https://dummyjson.com/products?limit=10000');
            const body = await result.json() as Empty;
            const products = body.products;

            if(!products.length) {
                throw new HttpException('Error al pullear data.', 500);
            };

            const response = await firstValueFrom(
                    this.productClient.send<SuccessDto<PartialProductDto[]>>(
                        { cmd: 'testing_load' },
                        { products }
                    )
                );
            

            if (!response.success){
                throw new HttpException(response.message, response.code);
            };

            return 'exito';
        } catch (err: any) {
            throw errorManager(err, GeneralService.name);
        }
    }
}

interface Empty {
    products: Product[];
    total:    number;
    skip:     number;
    limit:    number;
}

interface Product {
    id:                   number;
    title:                string;
    description:          string;
    category:             string;
    price:                number;
    discountPercentage:   number;
    rating:               number;
    stock:                number;
    tags:                 string[];
    brand?:               string;
    sku:                  string;
    weight:               number;
    dimensions:           Dimensions;
    warrantyInformation:  string;
    shippingInformation:  string;
    availabilityStatus:   string;
    reviews:              Review[];
    returnPolicy:         string;
    minimumOrderQuantity: number;
    meta:                 Meta;
    images:               string[];
    thumbnail:            string;
}

interface Dimensions {
    width:  number;
    height: number;
    depth:  number;
}

interface Meta {
    createdAt: Date;
    updatedAt: Date;
    barcode:   string;
    qrCode:    string;
}

interface Review {
    rating:        number;
    comment:       Comment;
    date:          Date;
    reviewerName:  string;
    reviewerEmail: string;
}