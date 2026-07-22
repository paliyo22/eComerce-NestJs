import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateReviewDto, SuccessDto, CreateProductDto, PartialProductDto, 
  UpdateProductDto, EProductCategory, ProductOrderDto, UnavailableProductsDto, 
  ProductDto, AccountReviewDto, ProductReviewDto, TransactionDto } from '@app/lib';
import { EMPTY, from, Observable, of, switchMap } from 'rxjs';
import { GeneralService } from './general.service';
import { AdminService } from './admin.service';
import { EventService } from './event.service';
import { ReviewService } from './review.service';

@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly generalService: GeneralService,
    private readonly adminService: AdminService,
    private readonly eventService: EventService,
    private readonly reviewService: ReviewService,
  ) {};

  @MessagePattern({ cmd: 'get_total' })
  getTotal (@Payload() data: { category?: EProductCategory }): Observable<SuccessDto<number>> {
    return from(this.productService.getTotal(data.category)).pipe(
      switchMap((result) => result ? of(result) : EMPTY)
    );
  }

  @MessagePattern({ cmd: 'get_product_list' })
  getProductList(@Payload() data: { limit?: number, offset?: number }): Observable<SuccessDto<PartialProductDto[]>> {
    return from(this.productService.getProductList(data.limit, data.offset))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
  };

  @MessagePattern({ cmd: 'get_my_product_list' })
  getMyProductList(@Payload() data: { accountId: string, limit?: number}): Observable<SuccessDto<PartialProductDto[]>> {
    return from(this.productService.getMyProductList(data.accountId, data.limit))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
  };

  @MessagePattern({ cmd: 'get_product_by_category' })
  getProductByCategory(@Payload() data: { category: EProductCategory, limit?: number, offset?: number }): Observable<SuccessDto<PartialProductDto[]>> {
    return from(this.productService.getProductByCategory(data.category, data.limit, data.offset))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
  };

  @MessagePattern({ cmd: 'get_featured' })
  getFeatured(@Payload() data: { limit?: number }): Observable<SuccessDto<PartialProductDto[]>> {
    return from(this.productService.getFeatured(data.limit))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
  };

  @MessagePattern({ cmd: 'search' })
  async searchProduct(@Payload() data: { contains: string, limit?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.productService.searchProduct(data.contains, data.limit);
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
  getProductById(@Payload() data: { productId: string }): Observable<SuccessDto<ProductDto>> {
    return from(this.productService.getProductById(data.productId))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
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
  getAccountReviews(@Payload() data: { accountId: string }): Observable<SuccessDto<AccountReviewDto[]>> {
    return from(this.reviewService.getAccountReviews(data.accountId))
      .pipe(switchMap((result) => result ? of(result) : EMPTY));
  }

  @MessagePattern({ cmd: 'create_review' })
  async addReview(@Payload() data: { accountId: string, review: CreateReviewDto }): Promise<SuccessDto<ProductReviewDto>> {
    return this.reviewService.addReview(data.accountId, data.review);
  }

  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { accountId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.reviewService.deleteReview(data.accountId, data.productId);
  }

  // ---------------------------- Admin Functions -----------------------------
  @EventPattern('calculate.rating')
  calculateRating(): void {
    this.adminService.calculateRating();
  }
  
  @MessagePattern({ cmd: 'ban_product' })
  async banProduct(@Payload() data: { adminId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.adminService.banProduct(data.adminId, data.productId);
  }
  
  @MessagePattern({ cmd: 'unban_product' })
  async unbanProduct(@Payload() data: { adminId: string, productId: string }): Promise<SuccessDto<void>> {
    return this.adminService.unbanProduct(data.adminId, data.productId);
  }
  
  @MessagePattern({ cmd: 'get_banned_list' })
  async getBanned(@Payload() data: { adminId: string, limit?: number, offset?: number }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.adminService.getBannedList(data.adminId, data.limit, data.offset);
  }

  // ---------------------------- Event Functions -----------------------------
  // se invoca en: Cart/getCart
  @MessagePattern({ cmd: 'get_product_from_list'})
  async getProductsFromList(@Payload() data: { productIds: string[]}): Promise<SuccessDto<PartialProductDto[]>> {
    return this.eventService.getProductsFromList(data.productIds);
  }

  // se invoca en: Account/[deleted, banned, suspended]
  @EventPattern({ cmd: 'delete.account.data' })
  async deleteAccountData(@Payload() data: { accountId: string }): Promise<void> {
    this.eventService.deleteAccountData(data.accountId);
  }

  // se invoca en: Cart/makeReserve / Order/createDraftOrder
  @MessagePattern({ cmd: 'reserve' })
  async reserve(@Payload() data: { products: {productId: string, amount: number}[] }): Promise<SuccessDto<ProductOrderDto[] | UnavailableProductsDto[]>> {
    return this.eventService.reserve(data.products);
  }

  // se invoca en Order/restoreStock
  @MessagePattern({ cmd: 'restore_stock' })
  async restoreStock(@Payload() data: { products: {productId: string, amount: number}[], token: TransactionDto }): Promise<void> {
    if(data.token){
      const result = await this.generalService.check(data.token);
      if(result === 'failed')
        return;

      if(result === 'completed')
        return;
    };
    return this.eventService.restoreStock(data.products, data.token);
  }

  // se invoca en: Cart/addToCart
  @MessagePattern({ cmd: 'is_active' })
  async isActive(@Payload() data: { productId: string }): Promise<SuccessDto<void>> {
    return this.eventService.isActive(data.productId);
  }

  @MessagePattern({ cmd: 'get_account_products'})
  async getAccountProducts(@Payload() data:{ id: string }): Promise<SuccessDto<PartialProductDto[]>> {
    return this.eventService.getAccountProducts(data.id);
  }








  //---------------------- Initial load for TESTING ---------------------------------
  @MessagePattern({ cmd: 'testing_load' })
  async loadDefaultAccounts(@Payload() data:{ products: any[] }): Promise<SuccessDto<void>> {
    return this.productService.seedProducts(data.products);
  }

  @MessagePattern({ cmd: 'get_categories' })
  async getCategories(): Promise<SuccessDto<string[] | any>> {
    return this.productService.getCategories();
  }
}
