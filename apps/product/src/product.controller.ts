import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateProductDto } from 'libs/dtos/product/createProduct';
import { PartialProductDto, ProductDto, UpdateProductDto } from 'libs/dtos/product';
import { SuccessDto } from 'libs/dtos/respuesta';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {};

  // GET: /
  @MessagePattern({ cmd: 'get_product_list' })
  async getProductList(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductList(data.limit, data.offset);
  };

  // GET: /:category
  @MessagePattern({ cmd: 'get_product_by_category' })
  async getProductsByCategory(@Payload() data: { category: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductsByCategory(data.category, data.limit, data.offset);
  };

  // GET: /:productId
  @MessagePattern({ cmd: 'get_product' })
  async getProductById(@Payload() data: { productId: string }): Promise<SuccessDto<ProductDto>> {
    return this.productService.getProductById(data.productId);
  }

  // POST: /
  @MessagePattern({ cmd: 'create_product' })
  async createProduct(@Payload() data: CreateProductDto & { userId: string }): Promise<SuccessDto<ProductDto>> {
    return this.productService.createProduct(data);
  };

  // PUT: /
  @MessagePattern({ cmd: 'update_product' })
  async updateProduct(@Payload() data: UpdateProductDto): Promise<SuccessDto<ProductDto>> {
    return this.productService.updateProduct(data);
  };

  // PATCH: /price
  @MessagePattern({ cmd: 'update_product_price' })
  async updatePrice(@Payload() data: { productId: string, price: number }): Promise<SuccessDto<null>> {
    return this.productService.updatePrice(data.productId, data.price);
  }

  // PATCH: /stock
  @MessagePattern({ cmd: 'modify_product_stock' })
  async modifyStock(@Payload() data: { productId: string, delta:number }): Promise<SuccessDto<number>> {
    return this.productService.modifyStock(data.productId, data.delta);
  }

  // PATCH: /discount
  @MessagePattern({ cmd: 'update_product_discount' })
  async updateDiscount(@Payload() data: { productId: string, discount: number }): Promise<SuccessDto<null>> {
    return this.productService.updateDiscount(data.productId, data.discount);
  }

  // DELETE: /:id
  @MessagePattern({ cmd: 'delete_product' })
  async deleteProduct(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<null>> {
    return this.productService.deleteProduct(data.userId, data.productId);
  }

  // POST: /review
  @MessagePattern({ cmd: 'create_review' })
  async addReview(@Payload() data: { userId: string, review: CreateReviewDto }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.addReview(data.userId, data.review);
  }

  // DELETE: /review/:productId
  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { userId: string, productId: string }): Promise<SuccessDto<null>> {
    return this.productService.deleteReview(data.userId, data.productId);
  }

  // POST: /calculateRating
  @MessagePattern({ cmd: 'calculate_rating' })
  async calculateRating(): Promise<SuccessDto<null>> {
    return this.productService.calculateRating();
  }

  // GET: /reviews/:userId
  @MessagePattern({ cmd: 'get_review_by_user' })
  async getReviews(@Payload() data: { userId: string }): Promise<SuccessDto<ReviewDto[]>> {
    return this.productService.getReviews(data.userId);
  }
}
