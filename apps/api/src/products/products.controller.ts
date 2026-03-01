import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProductService } from '../product/product.service';
type productAtrributes = {
  roastLevel?: string;
  grind?: string; 
  origin?: string;
  caffeine?: string;
  name?: string;
  process?: string;
  description?: string;

}

@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductService) {}

  @Get()
  getProducts(
    @Query('roastLevel') roastLevel?: string,
    @Query('roast') roast?: string,
    @Query('grind') grind?: string,
    @Query('origin') origin?: string,
    @Query('caffeine') caffeine?: string,
    @Query('name') name?: string,
    @Query('process') process?: string,
  ) {
    return this.productsService.getProducts({
      roastLevel: roastLevel ?? roast,
      grind,
      origin,
      caffeine,
      name,
      process,
    });
  }
  @Post()
  createProduct(@Body() product: productAtrributes) {
    return this.productsService.createProduct(product);
      }
  
}