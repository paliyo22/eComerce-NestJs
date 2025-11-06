import { Controller, Post, UseGuards, Body, Req } from '@nestjs/common';
import { ProductService } from '../service/product.service';
import { CreateProductDto } from 'libs/dtos/product/createProduct';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {};

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: CreateProductDto, @Req() req) {
    const userId = req.user.id;
    return this.productService.createProduct(dto, userId);
  }

}
