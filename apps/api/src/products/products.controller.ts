import { Controller, Get, Query } from '@nestjs/common';
import { ProductService } from '../product/product.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductService) {}

  @Get()
  getProducts( @Query('roastLevel') roastLevel?: string,
    @Query('grind') grind?: string,
    @Query('origin') origin?: string,
    @Query('caffeine') caffeine?: string,
    @Query('name') name?: string,
    @Query('process') process?: string

) {
    return this.productsService.getProducts();
   
  }
}