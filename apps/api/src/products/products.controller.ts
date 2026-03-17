import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { Roles } from 'src/common/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
type productAtrributes = {
  roastLevel?: string;
  grind?: string; 
  origin?: string;
  caffeine?: string;
  name?: string;
  process?: string;
  description?: string;

}
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductService) {}

  @Get('list')
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
  @Post('add')
  createProduct(@Body() product: productAtrributes) {
    return this.productsService.createProduct(product);
      }
  @Patch(':id')
  updateProduct(
    @Param('id') id: string,
    @Body() updateProduct: productAtrributes
  ) {
    return this.productsService.updateProduct(id, updateProduct);
  }
  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
  
}