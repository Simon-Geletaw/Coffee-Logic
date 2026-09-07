import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/**
 * Public storefront catalogue. Deliberately unguarded — these are the only
 * product routes a shopper can reach (/admin/products requires an admin JWT).
 *
 *   GET /catalog/products        — active products with their active variants
 *   GET /catalog/products/facets — distinct filter values present in the catalogue
 *   GET /catalog/products/:id    — one product with variants
 */
@Controller('catalog/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listProducts(
    @Query('roastLevel') roastLevel?: string,
    @Query('grind') grind?: string,
    @Query('origin') origin?: string,
    @Query('caffeine') caffeine?: string,
    @Query('process') process?: string,
    @Query('name') name?: string,
    @Query('currency') currency?: string,
  ) {
    return this.catalogService.listProducts({
      roastLevel,
      grind,
      origin,
      caffeine,
      process,
      name,
      currency,
    });
  }

  // Declared before :id so "facets" is not captured as a product id.
  @Get('facets')
  getFacets() {
    return this.catalogService.getFacets();
  }

  @Get(':id')
  getProduct(@Param('id') id: string) {
    return this.catalogService.getProduct(id);
  }
}
