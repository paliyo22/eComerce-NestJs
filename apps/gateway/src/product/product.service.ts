import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SuccessDto, CreateProductDto, PartialProductDto, UpdateProductDto, 
    withRetry, EProductCategory, ProductDto } from '@app/lib';
import { v4 as uuidv4 } from 'uuid';
import { errorManager } from '../helpers/errorManager';

@Injectable()
export class ProductService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy
    ) {};

    async getTotal(category?: EProductCategory): Promise<number> {
        try {
            const messageId = uuidv4();
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<number>>(
                    {cmd: 'get_total'},
                    { messageId, category }
                ).pipe(withRetry())
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async getProductList(limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_product_list' },
                    { limit, offset }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };
    
    async getMyProductList(accountId: string, limit?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_my_product_list' },
                    { accountId, limit }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };

    async getProductByCategory(category: EProductCategory, limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_product_by_category' },
                    { category, limit, offset }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };

    async getFeatured(limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_featured' },
                    { limit, offset }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async searchProduct (contains: string, limit?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'search' },
                    { contains, limit }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async accountProductList (username: string): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_account_products' },
                    { username }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async addProduct(accountId: string, product: CreateProductDto): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'create_product' },
                    { accountId, product }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'product');
        }
    };

    async updateDiscount (accountId: string, productId: string, discount: number): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'update_discount' },
                    { accountId, productId, discount }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async updatePrice (accountId: string, productId: string, price: number): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'update_price' },
                    { accountId, productId, price }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async updateStock (accountId: string, productId: string, stock: number): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'update_stock' },
                    { accountId, productId, stock }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    }

    async getProductById(productId: string): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'get_product' },
                    { productId }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'product');
        }   
    }

    async deleteProduct(accountId: string, productId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'delete_product' },
                    { accountId, productId }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };

    async restoreProduct(accountId: string, productId: string): Promise<void> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'restore_product' },
                    { accountId, productId }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };

    async updateProduct(accountId: string, productId: string, product: UpdateProductDto): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'update_product' },
                    { accountId, productId, product }
                ).pipe(withRetry())
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err: any) {
            throw errorManager(err, 'products');
        }
    };        
}
