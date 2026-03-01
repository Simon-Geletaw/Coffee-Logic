export type Product = {
  id: string;
  name: string;
  roast: string;
  grind: string;
  origin: string;
  process: string;
  caffeine: string;
  description?: string;
};

export type ProductForm = {
  name: string;
  roastLevel: string;
  grind: string;
  origin: string;
  process: string;
  caffeine: string;
  description: string;
};

export const emptyProductForm: ProductForm = {
  name: '',
  roastLevel: '',
  grind: '',
  origin: '',
  process: '',
  caffeine: '',
  description: '',
};

export const mapProductToForm = (product: Product): ProductForm => ({
  name: product.name ?? '',
  roastLevel: product.roast ?? '',
  grind: product.grind ?? '',
  origin: product.origin ?? '',
  process: product.process ?? '',
  caffeine: product.caffeine ?? '',
  description: product.description ?? '',
});
