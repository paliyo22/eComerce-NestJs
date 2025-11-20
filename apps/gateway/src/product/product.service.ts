import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateProductDto, PartialProductDto, ProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/shared/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProductService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy
    ) {};

    async getTotal(category?: string): Promise<number> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<number>>(
                    {cmd: 'get_total'},
                    { category }
                )
            ); 

            if(!result.success) {
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async getProductList(limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_product_list' },
                    { limit, offset }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async getProductByCategory(category: string, limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_product_by_category' },
                    { category, limit, offset }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async getFeatured(limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_featured' },
                    { limit, offset }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async getProductById(productId: string): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'get_product_by_id' },
                    { productId }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async addReview(userId: string, review: CreateReviewDto): Promise<ReviewDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ReviewDto[]>>(
                    { cmd: 'create_review' },
                    { userId, review }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async deleteReview (userId: string, productId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'delete_review' },
                    { userId, productId }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async searchProduct (contain: string): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'search' },
                    { contain }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async accountProductList (userId: string): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'account_product_list' },
                    { userId }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async updateDiscount (userId: string, productId: string, discount: number): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'update_discount' },
                    { userId, productId, discount }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async updatePrice (userId: string, productId: string, price: number): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<void>>(
                    { cmd: 'update_price' },
                    { userId, productId, price }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async modifyStock (userId: string, productId: string, delta: number): Promise<number> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<number>>(
                    { cmd: 'modify_stock' },
                    { userId, productId, delta }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async updateProduct(userId: string, product: UpdateProductDto): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'update_product' },
                    { userId, product }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };    

    async addProduct(userId: string, product: CreateProductDto): Promise<ProductDto> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'create_product' },
                    { userId, product }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async deleteProduct(userId: string, productId: string): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<string>>(
                    { cmd: 'delete_product' },
                    { userId, productId }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async calculateRating(): Promise<string> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<string>>(
                    { cmd: 'calculate_rating' },
                    {}
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.message!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };

    async getAccountReviews(userId: string): Promise<ReviewDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<ReviewDto[]>>(
                    { cmd: 'get_review_by_user' },
                    { userId }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err?.message && err?.code) {
                throw new HttpException(err.message, err.code);
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };
}
