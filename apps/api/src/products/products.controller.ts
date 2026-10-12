import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { Roles } from '../common/decorator/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';

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
  @Post()
  createProductRest(@Body() product: CreateProductDto) {
    return this.productsService.createProduct(product);
  }

  @Post('add')
  createProduct(@Body() product: CreateProductDto) {
    return this.productsService.createProduct(product);
  }

  @Post('bulk-add')
  createProductsBulk(@Body() products: CreateProductDto[]) {
    return this.productsService.createProducts(products);
  }

  @Patch(':id')
  updateProduct(
    @Param('id') id: string,
    @Body() updateProduct: CreateProductDto,
  ) {
    return this.productsService.updateProduct(id, updateProduct);
  }
  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}
