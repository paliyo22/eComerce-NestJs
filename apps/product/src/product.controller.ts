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

  @MessagePattern({ cmd: 'get_total' })
  async getTotal (@Payload() data: { category?: string }): Promise<SuccessDto<number>> {
    return this.productService.getTotal(data.category);
  }

  @MessagePattern({ cmd: 'get_product_list' })
  async getProductList(@Payload() data: { userId?: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductList(data.userId, data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'get_product_by_category' })
  async getProductByCategory(@Payload() data: { category: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductByCategory(data.category, data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'get_featured' })
  async getFeatured(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getFeatured(data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'get_product_by_id' })
  async getProductById(@Payload() data: { productId: string }): Promise<SuccessDto<ProductDto>> {
    return this.productService.getProductById(data.productId);
  }

  @MessagePattern({ cmd: 'create_review' })
  async addReview(@Payload() data: { userId: string, review: CreateReviewDto }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.addReview(data.userId, data.review);
  }

  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteReview(data.userId, data.productId);
  }

  @MessagePattern({ cmd: 'search' })
  async searchProduct(@Payload() data: { contain: string }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.searchProduct(data.contain);
  }

  @MessagePattern({ cmd: 'update_price' })
  async updatePrice(@Payload() data: { userId: string, productId: string, price: number }): Promise<SuccessDto<void>> {
    return this.productService.updatePrice(data.userId, data.productId, data.price);
  }

  @MessagePattern({ cmd: 'update_discount' })
  async updateDiscount(@Payload() data: { userId: string, productId: string, discount: number }): Promise<SuccessDto<void>> {
    return this.productService.updateDiscount(data.userId, data.productId, data.discount);
  }
  
  @MessagePattern({ cmd: 'modify_stock' })
  async modifyStock(@Payload() data: { userId: string, productId: string, delta:number }): Promise<SuccessDto<number>> {
    return this.productService.modifyStock(data.userId, data.productId, data.delta);
  }

  @MessagePattern({ cmd: 'update_product' })
  async updateProduct(@Payload() data: { userId: string, productId: string, product: UpdateProductDto }): Promise<SuccessDto<ProductDto>> {
    return this.productService.updateProduct(data.userId, data.productId, data.product);
  };

  @MessagePattern({ cmd: 'create_product' })
  async createProduct(@Payload() data: { userId: string, product: CreateProductDto }): Promise<SuccessDto<ProductDto>> {
    return this.productService.createProduct(data.userId, data.product);
  };

  @MessagePattern({ cmd: 'delete_product' })
  async deleteProduct(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteProduct(data.userId, data.productId);
  }

  @MessagePattern({ cmd: 'calculate_rating' })
  async calculateRating(): Promise<SuccessDto<void>> {
    return this.productService.calculateRating();
  }

  @MessagePattern({ cmd: 'get_review_by_user' })
  async getAccountReviews(@Payload() data: { userId: string }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.getAccountReviews(data.userId);
  }
}
