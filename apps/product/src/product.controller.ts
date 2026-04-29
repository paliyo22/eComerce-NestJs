import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateReviewDto, SuccessDto, CreateProductDto, PartialProductDto, 
  UpdateProductDto, EProductCategory, ProductOrderDto, UnavailableProductsDto, 
  ProductDto, AccountReviewDto, ProductReviewDto } from '@app/lib';

@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService
  ) {};

  @MessagePattern({ cmd: 'get_total' })
  async getTotal (@Payload() data: { category?: EProductCategory }): Promise<SuccessDto<number>> {
    return this.productService.getTotal(data.category);
  }

  @MessagePattern({ cmd: 'get_product_list' })
  async getProductList(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductList(data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'get_my_product_list' })
  async getMyProductList(@Payload() data: { accountId: string, limit?: number}): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getMyProductList(data.accountId, data.limit);
  };

  @MessagePattern({ cmd: 'get_product_by_category' })
  async getProductByCategory(@Payload() data: { category: EProductCategory, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductByCategory(data.category, data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'get_featured' })
  async getFeatured(@Payload() data: { limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getFeatured(data.limit, data.offset);
  };

  @MessagePattern({ cmd: 'search' })
  async searchProduct(@Payload() data: { contains: string, limit?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.searchProduct(data.contains, data.limit);
  }

  @MessagePattern({ cmd: 'get_account_products'})
  async getAccountProducts(@Payload() data:{ username: string }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getAccountProducts(data.username);
  }

  @MessagePattern({ cmd: 'create_product' })
  async createProduct(@Payload() data: { accountId: string, product: CreateProductDto }): Promise<SuccessDto<ProductDto | string>> {
    return this.productService.createProduct(data.accountId, data.product);
  };

  @MessagePattern({ cmd: 'update_discount' })
  async updateDiscount(@Payload() data: { accountId: string, productId: string, discount: number }): Promise<SuccessDto<void>> {
    return this.productService.updateDiscount(data.accountId, data.productId, data.discount);
  }

  @MessagePattern({ cmd: 'update_price' })
  async updatePrice(@Payload() data: { accountId: string, productId: string, price: number }): Promise<SuccessDto<void>> {
    return this.productService.updatePrice(data.accountId, data.productId, data.price);
  }
  
  @MessagePattern({ cmd: 'update_stock' })
  async updateStock(@Payload() data: { accountId: string, productId: string, stock: number }): Promise<SuccessDto<void>> {
    return this.productService.updateStock(data.accountId, data.productId, data.stock);
  }

  @MessagePattern({ cmd: 'get_product' })
  async getProductById(@Payload() data: { productId: string }): Promise<SuccessDto<ProductDto>> {
    return this.productService.getProductById(data.productId);
  }

  @MessagePattern({ cmd: 'delete_product' })
  async deleteProduct(@Payload() data: { accountId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteProduct(data.accountId, data.productId);
  }

  @MessagePattern({ cmd: 'restore_product' })
  async restoreProduct(@Payload() data: { accountId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.restoreProduct(data.accountId, data.productId);
  }

  @MessagePattern({ cmd: 'update_product' })
  async updateProduct(@Payload() data: { accountId: string, productId: string, product: UpdateProductDto }): Promise<SuccessDto<ProductDto>> {
    return this.productService.updateProduct(data.accountId, data.productId, data.product);
  };

  @MessagePattern({ cmd: 'get_account_reviews' })
  async getAccountReviews(@Payload() data: { accountId: string }): Promise<SuccessDto<AccountReviewDto[]>> {
    return this.productService.getAccountReviews(data.accountId);
  }

  @MessagePattern({ cmd: 'create_review' })
  async addReview(@Payload() data: { accountId: string, review: CreateReviewDto }): Promise<SuccessDto<ProductReviewDto>> {
    return this.productService.addReview(data.accountId, data.review);
  }

  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { accountId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteReview(data.accountId, data.productId);
  }

  // ---------------------------- Admin Functions -----------------------------
  @EventPattern('calculate.rating')
  calculateRating(): void {
    this.productService.calculateRating();
  }
  
  @MessagePattern({ cmd: 'ban_product' })
  async banProduct(@Payload() data: { adminId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.banProduct(data.adminId, data.productId);
  }
  
  @MessagePattern({ cmd: 'unban_product' })
  async unbanProduct(@Payload() data: { adminId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.productService.unbanProduct(data.adminId, data.productId);
  }
  
  @MessagePattern({ cmd: 'get_banned_list' })
  async getBanned(@Payload() data: { adminId: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getBannedList(data.adminId, data.limit, data.offset);
  }

  // ---------------------------- Event Functions -----------------------------
  // se invoca en: Cart/getCart
  @MessagePattern({ cmd: 'get_product_from_list'})
  async getProductsFromList(@Payload() data: { productIds: string[]}): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.getProductsFromList(data.productIds);
  }

  @MessagePattern({ cmd: 'delete_account_data' })
  async deleteAccountData(@Payload() data: { accountId: string }): Promise<SuccessDto<void>> {
    return this.productService.deleteAccountData(data.accountId);
  }

  // se invoca en: Cart/makeReserve / Order/createDraftOrder
  @MessagePattern({ cmd: 'reserve' })
  async reserve(@Payload() data: { products: {productId: string, amount: number}[] }): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
    return this.productService.reserve(data.products);
  }

  // se invoca en Order/restoreStock
  @MessagePattern({ cmd: 'restore_stock' })
  async restoreStock(@Payload() data: { products: {productId: string, amount: number}[] }): Promise<void> {
    return this.productService.restoreStock(data.products);
  }

  // se invoca en: Cart/addToCart
  @MessagePattern({ cmd: 'is_active' })
  async isActive(@Payload() data: { productId: string }): Promise<SuccessDto<void>> {
    return this.productService.isActive(data.productId);
  }
}
