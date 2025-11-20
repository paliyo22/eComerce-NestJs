import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateProductDto } from 'libs/dtos/product/createProduct';
import { PartialProductDto, ProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/shared/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {};

  // GET: /total
  @MessagePattern({ cmd: 'get_total' })
  async getTotal (@Payload() data: { category?: string }): Promise<SuccessDto<number>> {
    return this.productService.getTotal(data.category);
  }

  // GET: /
  @MessagePattern({ cmd: 'get_product_list' })
  async getProductList(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductList(data.limit, data.offset);
  };

  // GET: /:category
  @MessagePattern({ cmd: 'get_product_by_category' })
  async getProductByCategory(@Payload() data: { category: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductByCategory(data.category, data.limit, data.offset);
  };

  // GET: /featured
  @MessagePattern({ cmd: 'get_featured' })
  async getFeatured(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getFeatured(data.limit, data.offset);
  };

  // GET: /:productId
  @MessagePattern({ cmd: 'get_product_by_id' })
  async getProductById(@Payload() data: { productId: string }): Promise<SuccessDto<ProductDto>> {
    return this.productService.getProductById(data.productId);
  }

  // POST: /review
  @MessagePattern({ cmd: 'create_review' })
  async addReview(@Payload() data: { userId: string, review: CreateReviewDto }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.addReview(data.userId, data.review);
  }

  // DELETE: /review/:productId
  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteReview(data.userId, data.productId);
  }

  // GET: /search
  @MessagePattern({ cmd: 'search' })
  async searchProduct(@Payload() data: { contain: string }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.searchProduct(data.contain);
  }
  
  // GET: /:username
  @MessagePattern({ cmd: 'account_product_list'})
  async accountProductList (@Payload() data: { userId: string }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.accountProductList(data.userId);
  }

  // PATCH: /price/:productId
  @MessagePattern({ cmd: 'update_price' })
  async updatePrice(@Payload() data: { userId: string, productId: string, price: number }): Promise<SuccessDto<void>> {
    return this.productService.updatePrice(data.userId, data.productId, data.price);
  }

  // PATCH: /discount/:productId
  @MessagePattern({ cmd: 'update_discount' })
  async updateDiscount(@Payload() data: { userId: string, productId: string, discount: number }): Promise<SuccessDto<void>> {
    return this.productService.updateDiscount(data.userId, data.productId, data.discount);
  }
  
  // PATCH: /stock/:productId
  @MessagePattern({ cmd: 'modify_stock' })
  async modifyStock(@Payload() data: { userId: string, productId: string, delta:number }): Promise<SuccessDto<number>> {
    return this.productService.modifyStock(data.userId, data.productId, data.delta);
  }

  // PUT: /
  @MessagePattern({ cmd: 'update_product' })
  async updateProduct(@Payload() data: { userId: string, product: UpdateProductDto }): Promise<SuccessDto<ProductDto>> {
    return this.productService.updateProduct(data.userId, data.product);
  };

  // POST: /
  @MessagePattern({ cmd: 'create_product' })
  async createProduct(@Payload() data: { userId: string, product: CreateProductDto }): Promise<SuccessDto<ProductDto>> {
    return this.productService.createProduct(data.userId, data.product);
  };

  // DELETE: /:productId
  @MessagePattern({ cmd: 'delete_product' })
  async deleteProduct(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteProduct(data.userId, data.productId);
  }

  // POST: /calculate-rating
  @MessagePattern({ cmd: 'calculate_rating' })
  async calculateRating(): Promise<SuccessDto<void>> {
    return this.productService.calculateRating();
  }

  // GET: /review/user
  @MessagePattern({ cmd: 'get_review_by_user' })
  async getAccountReviews(@Payload() data: { userId: string }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.getAccountReviews(data.userId);
  }
}
