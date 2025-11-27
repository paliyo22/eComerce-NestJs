import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateProductDto, PartialProductDto, ProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/shared/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { firstValueFrom } from 'rxjs';
import { ProductOutputDto } from './completeProduct';
import { AccountDto, PartialAccountDto } from 'libs/dtos/acount';

@Injectable()
export class ProductService {
    constructor (
        @Inject('PRODUCT_SERVICE') 
        private readonly productClient: ClientProxy,
        @Inject('ACCOUNT_SERVICE') 
        private readonly accountClient: ClientProxy
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
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async getProductList(userId?: string, limit?: number, offset?: number): Promise<PartialProductDto[]> {
        try {
            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'get_product_list' },
                    { userId, limit, offset }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };

            return result.data!;
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

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
            
            let accountList = [] as PartialAccountDto[]
            if (result.data!.length) {
                const accounts = result.data!.map((a) => a.accountId);

                const list = await firstValueFrom(
                    this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                        {cmd: 'get_account_list_info'},
                        { accounts }
                    )
                ); 
    
                if(!list.success) {
                    throw new HttpException(list.message!, list.code!);
                };

                accountList = list.data!
            }

            return ReviewDto.loadArray(result.data!, accountList);
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async getProductById(productId: string): Promise<ProductOutputDto> {
        try {
            const product = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'get_product_by_id' },
                    { productId }
                )
            );

            if (!product.success){
                throw new HttpException(product.message!, product.code!);
            };

            const account = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId: product.data!.userId }
                )
            ); 

            if(!account.success) {
                throw new HttpException(account.message!, account.code!);
            };

            let accountList = [] as PartialAccountDto[]
            if (product.data!.reviews?.length) {
                const accounts = product.data!.reviews.map((a) => a.accountId);

                const result = await firstValueFrom(
                    this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                        {cmd: 'get_account_list_info'},
                        { accounts }
                    )
                ); 
    
                if(!result.success) {
                    throw new HttpException(result.message!, result.code!);
                };

                accountList = result.data!
            }

            return ProductOutputDto.fromEntities(product.data!, account.data!, accountList);
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async accountProductList (username: string): Promise<PartialProductDto[]> {
        try {
            const account = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_account_info'},
                    { adminId: String(process.env.INTERNAL_PASSWORD), username}
                )
            )

            if (!account.success){
                throw new HttpException(account.message!, account.code!);
            };

            const result = await firstValueFrom(
                this.productClient.send<SuccessDto<PartialProductDto[]>>(
                    { cmd: 'account_product_list' },
                    { userId: account.data!.id }
                )
            );

            if (!result.success){
                throw new HttpException(result.message!, result.code!);
            };
            
            return result.data!;
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    }

    async updateProduct(userId: string, productId: string, product: UpdateProductDto): Promise<ProductOutputDto> {
        try {
            const newProduct = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'update_product' },
                    { userId, productId, product }
                )
            );

            if (!newProduct.success){
                throw new HttpException(newProduct.message!, newProduct.code!);
            };

            const account = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId }
                )
            ); 

            if(!account.success) {
                throw new HttpException(account.message!, account.code!);
            };

            let accountList = [] as PartialAccountDto[]
            if (newProduct.data!.reviews?.length) {
                const accounts = newProduct.data!.reviews.map((a) => a.accountId);

                const result = await firstValueFrom(
                    this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                        {cmd: 'get_account_list_info'},
                        { accounts }
                    )
                ); 
    
                if(!result.success) {
                    throw new HttpException(result.message!, result.code!);
                };

                accountList = result.data!
            }

            return ProductOutputDto.fromEntities(newProduct.data!, account.data!, accountList);
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };    

    async addProduct(userId: string, product: CreateProductDto): Promise<ProductOutputDto> {
        try {
            const newProduct = await firstValueFrom(
                this.productClient.send<SuccessDto<ProductDto>>(
                    { cmd: 'create_product' },
                    { userId, product }
                )
            );

            if (!newProduct.success){
                throw new HttpException(newProduct.message!, newProduct.code!);
            };

            const account = await firstValueFrom(
                this.accountClient.send<SuccessDto<AccountDto>>(
                    {cmd: 'get_info'},
                    { userId }
                )
            ); 

            if(!account.success) {
                throw new HttpException(account.message!, account.code!);
            };

            let accountList = [] as PartialAccountDto[]
            if (newProduct.data!.reviews?.length) {
                const accounts = newProduct.data!.reviews.map((a) => a.accountId);

                const result = await firstValueFrom(
                    this.accountClient.send<SuccessDto<PartialAccountDto[]>>(
                        {cmd: 'get_account_list_info'},
                        { accounts }
                    )
                ); 
    
                if(!result.success) {
                    throw new HttpException(result.message!, result.code!);
                };

                accountList = result.data!
            }

            return ProductOutputDto.fromEntities(newProduct.data!, account.data!, accountList);
        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
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
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException('Error interno comunicando con microservicio', 500);
        }
    };
}
