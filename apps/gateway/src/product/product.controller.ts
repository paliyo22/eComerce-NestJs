import { BadRequestException, Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { PartialProductDto, CompleteProductDto, UpdateProductDto, CreateProductDto } from 'libs/dtos/product';
import { CreateReviewDto, ReviewDto } from 'libs/dtos/review';
import { ECategory } from 'libs/shared/category-enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProductService } from './product.service';
import { RolesGuard } from '../guards/role.guard';
import { ERole } from 'libs/shared/role-enum';
import { Roles } from '../decorators/role.decorator';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {};

  @Get('/total')
  async getTotal(@Query('category') category?: string): Promise<number> {
    return this.productService.getTotal(category);
  }

  @Get()
  async getProductList(
    @Query('limit', ParseIntPipe) limit?: number, 
    @Query('offset', ParseIntPipe) offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductList(limit, offset);
  }

  @Get('/category/:category')
  async getProductByCategory(
    @Param('category', new ParseEnumPipe(ECategory)) category: ECategory,
    @Query('limit', ParseIntPipe) limit?: number, 
    @Query('offset', ParseIntPipe) offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductByCategory(category, limit, offset);
  }

  @Get('/featured')
  async getFeatured(
    @Query('limit', ParseIntPipe) limit?: number, 
    @Query('offset', ParseIntPipe) offset?: number
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
    const reviewList = await this.productService.addReview(userId, review);
    const accountList = await ;
    return ReviewDto.loadArray(reviewList, accountList);
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
    const id = await ;//aca se llama al metodo que me da el id
    return this.productService.accountProductList(id);
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

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateProduct(
    @Body('product', new ValidationPipe({whitelist: true, transform: true})) product: UpdateProductDto,
    @Req() req
  ): Promise<CompleteProductDto> {
    const userId = req.user.userId;
    const newProduct = await this.productService.updateProduct(userId, product); 
    const account = await ;
    const accounts = await ;
    return CompleteProductDto.fromEntities(newProduct, account, accounts);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addProduct(
    @Body('product', new ValidationPipe({whitelist: true, transform: true})) product: CreateProductDto,
    @Req() req
  ): Promise<CompleteProductDto> {
    const userId = req.user.userId;
    
    const newProduct = await this.productService.addProduct(userId, product); 
    const account = await ;
    const accounts = await ;
    return CompleteProductDto.fromEntities(newProduct, account, accounts);
  }

  @Post('/calculate-rating')
  @UseGuards(JwtAuthGuard)
  async calculateRating(@Req() req): Promise<string> {

    return this.productService.calculateRating();
  }

  @Get('/review/user')
  @UseGuards(JwtAuthGuard)
  async getAccountReviews(@Req() req): Promise<ReviewDto[]>{
    const userId = req.user.userId;
    return this.productService.getAccountReviews(userId)
  }

  @Get('/:productId') // ACA SE TIENE QUE CONVINAR CON USER
  async getProductById (@Param('productId', new ParseUUIDPipe()) productId: string): Promise<CompleteProductDto> {
    const product = await this.productService.getProductById(productId); 
    const account = await ;
    const accounts = await ;
    return CompleteProductDto.fromEntities(product, account, accounts);
  }

  @Delete('/:productId')
  @UseGuards(JwtAuthGuard)
  async deleteProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Req() req
  ): Promise<string> {
    const userId = req.user.userId;
    return this.productService.deleteProduct(userId, productId);
  }
}
