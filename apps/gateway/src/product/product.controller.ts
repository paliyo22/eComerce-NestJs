import { BadRequestException, Body, Controller, Delete, Get, Param, 
  ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseUUIDPipe, 
  Patch, Post, Put, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { PartialProductDto, UpdateProductDto, CreateProductDto } from 'libs/dtos/product';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { ECategory } from 'libs/shared/category-enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProductService } from './product.service';
import { RolesGuard } from '../guards/role.guard';
import { ERole } from 'libs/shared/role-enum';
import { Roles } from '../decorators/role.decorator';
import { ProductOutputDto } from './completeProduct';

@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService
  ) {};

  @Get('/total')
  async getTotal(@Query('category') category?: string): Promise<number> {
    return this.productService.getTotal(category);
  }

  @Get()
  async getProductList(
    @Query('limit') limit?: number, 
    @Query('offset') offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductList(undefined, limit, offset);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async getMyProductList(
    @Req() req
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductList(req.user.userId);
  }

  @Get('/category/:category')
  async getProductByCategory(
    @Param('category', new ParseEnumPipe(ECategory)) category: ECategory,
    @Query('limit') limit?: number, 
    @Query('offset') offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductByCategory(category, limit, offset);
  }

  @Get('/featured')
  async getFeatured(
    @Query('limit') limit?: number, 
    @Query('offset') offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getFeatured(limit, offset);
  }

  @Post('/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ERole.User, ERole.Seller)
  async addReview (
    @Body('review', new ValidationPipe({whitelist: true, transform: true})) review: CreateReviewDto,
    @Req() req
  ): Promise<ReviewDto[]> {
    const userId = req.user.userId;
    return this.productService.addReview(userId, review);
  }

  @Delete('/review/:productId')
  @UseGuards(JwtAuthGuard)
  async deleteReview (
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Req() req
  ): Promise<string> {
    const userId = req.user.userId;
    return this.productService.deleteReview(userId, productId);
  }

  @Get('/search')
  searchProduct (@Query('contain') contain: string): Promise<PartialProductDto[]> {
    return this.productService.searchProduct(contain);
  }

  @Get('/user/:username')
  async getAccountProducts(
    @Param('username') username: string
  ): Promise<PartialProductDto[]> {
    return this.productService.accountProductList(username);
  }

  @Patch('/discount/:productId')
  @UseGuards(JwtAuthGuard)
  async updateDiscount (
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body('discount', ParseFloatPipe) discount: number,
    @Req() req
  ): Promise<string> {
    if (isNaN(discount) || discount < 0 || discount > 100) {
      throw new BadRequestException('Porcentaje inválido debe ser entre 0-100');
    }
    const userId = req.user.userId;
    return this.productService.updateDiscount(userId, productId, discount);
  }

  @Patch('/price/:productId')
  @UseGuards(JwtAuthGuard)
  async updatePrice (
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body('price', ParseFloatPipe) price: number,
    @Req() req
  ): Promise<string> {
    if (price <= 0) throw new BadRequestException('Precio inválido debe ser mayor a 0');
    const userId = req.user.userId;
    return this.productService.updatePrice(userId, productId, price);
  }

  @Patch('/stock/:productId')
  @UseGuards(JwtAuthGuard)
  async modifyStock (
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body('delta', new ParseIntPipe()) delta: number,
    @Req() req
  ): Promise<number> {
    const userId = req.user.userId;
    return this.productService.modifyStock(userId, productId, delta);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addProduct(
    @Body('product') product: CreateProductDto,
    @Req() req
  ): Promise<ProductOutputDto> {
    return this.productService.addProduct(req.user.userId, product); 
  }

  @Post('/calculate-rating')
  @UseGuards(JwtAuthGuard)
  async calculateRating(): Promise<string> {
    return this.productService.calculateRating();
  }

  @Get('/review/user')
  @UseGuards(JwtAuthGuard)
  async getAccountReviews(@Req() req): Promise<ReviewDto[]>{
    const userId = req.user.userId;
    return this.productService.getAccountReviews(userId)
  }

  @Get('/:productId')
  async getProductById (@Param('productId', new ParseUUIDPipe()) productId: string): Promise<ProductOutputDto> {
    return this.productService.getProductById(productId); 
  }

  @Put('/:productId')
  @UseGuards(JwtAuthGuard)
  async updateProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body('product') product: UpdateProductDto,
    @Req() req
  ): Promise<ProductOutputDto> {
    return this.productService.updateProduct(req.user.userId, productId, product);
  }

  @Delete('/:productId')
  @UseGuards(JwtAuthGuard)
  async deleteProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Req() req
  ): Promise<string> {
    return this.productService.deleteProduct(req.user.userId, productId);
  }
}
