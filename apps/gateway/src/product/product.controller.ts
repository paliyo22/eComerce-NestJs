import { BadRequestException, Body, Controller, Delete, ForbiddenException, 
  Get, HttpCode, Param, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseUUIDPipe, 
  Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { PartialProductDto, UpdateProductDto, CreateProductDto, ERole, 
  getRoleGroup, EProductCategory, ProductDto} from '@app/lib';
import { JwtAuthGuard } from '../guards/jwtAuth.guard';
import type { JwtPayload } from '../interfaces/JwtPayload';
import { User } from '../decorators/authGuard.decorator';

@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService
  ) {};

  //--------------------- Public Methods ----------------------------------
  @Get('/total')
  async getTotal(
    @Query('category', new ParseEnumPipe(EProductCategory, { optional: true })) category?: EProductCategory
  ): Promise<number> {
    return this.productService.getTotal(category);
  }

  @Get()
  async getProductList(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductList(limit, offset);
  }

  @Get('/category/:category')
  async getProductByCategory(
    @Param('category', new ParseEnumPipe(EProductCategory)) category: EProductCategory,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getProductByCategory(category, limit, offset);
  }

  @Get('/featured')
  async getFeatured(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getFeatured(limit, offset);
  }

  @Get('/search')
  searchProduct (
    @Query('contain') contain: string
  ): Promise<PartialProductDto[]> {
    return this.productService.searchProduct(contain);
  }

  @Get('/user/:username')
  async getAccountProducts(
    @Param('username') username: string
  ): Promise<PartialProductDto[]> {
    return this.productService.accountProductList(username);
  }

  //--------------------- Private Methods ----------------------------------
  
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async addProduct(
    @Body() product: CreateProductDto,
    @User() data: JwtPayload
  ): Promise<ProductDto> {
    if(data.role === ERole.User || getRoleGroup(data.role) === ERole.Admin){
      throw new ForbiddenException();
    }
    return this.productService.addProduct(data.accountId, product); 
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async getMyProductList(
    @User('accountId') accountId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ): Promise<PartialProductDto[]> {
    return this.productService.getMyProductList(accountId, limit);
  }

  @Patch('/discount/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async updateDiscount (
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body('discount', ParseFloatPipe) discount: number,
    @User('accountId') accountId: string,
  ): Promise<void> {
    if (isNaN(discount) || discount < 0 || discount > 100) {
      throw new BadRequestException('Porcentaje inválido debe ser entre 0-100');
    }
    await this.productService.updateDiscount(accountId, productId, discount);
  }

  @Patch('/price/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async updatePrice (
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body('price', ParseFloatPipe) price: number,
    @User('accountId') accountId: string
  ): Promise<void> {
    if (price < 0) throw new BadRequestException('Price can`t be negative');
    await this.productService.updatePrice(accountId, productId, price);
  }

  @Patch('/stock/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async updateStock (
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body('stock', ParseIntPipe) stock: number,
    @User('accountId') accountId: string
  ): Promise<void> {
    await this.productService.updateStock(accountId, productId, stock);
  }

  @Patch('/restore/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async restoreProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @User('accountId') accountId: string
  ): Promise<void> {
    await this.productService.restoreProduct(accountId, productId);
  }
  //--------------------- "/:" ----------------------------------------

  @Get('/:productId')
  async getProductById (
    @Param('productId', ParseUUIDPipe) productId: string
  ): Promise<ProductDto> {
    return this.productService.getProductById(productId); 
  }

  @Put('/:productId')
  @UseGuards(JwtAuthGuard)
  async updateProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() product: UpdateProductDto,
    @User('accountId') accountId: string
  ): Promise<ProductDto> {
    return this.productService.updateProduct(accountId, productId, product);
  }

  @Delete('/:productId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async deleteProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @User('accountId') accountId: string
  ): Promise<void> {
    await this.productService.deleteProduct(accountId, productId);
  }
}
