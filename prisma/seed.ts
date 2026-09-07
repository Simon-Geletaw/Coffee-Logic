import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Yirgacheffe Sundried',
    description:
      'Bright, floral, and fruit-forward with notes of blueberry and jasmine.',
    roastLevel: 'light',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'natural',
    caffeine: 'regular',
    sensoryProfile: { body: 'light', acidity: 'high', sweetness: 'high' },
    variants: [
      { weightGrams: 250, priceCents: 1200, sku: 'ETH-YIRG-250' },
      { weightGrams: 1000, priceCents: 4200, sku: 'ETH-YIRG-1000' },
    ],
  },
  {
    name: 'Sidamo Washed',
    description: 'Clean and citrusy with a delicate tea-like body.',
    roastLevel: 'light-medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'washed',
    caffeine: 'regular',
    sensoryProfile: { body: 'medium', acidity: 'high', sweetness: 'medium' },
    variants: [
      { weightGrams: 250, priceCents: 1100, sku: 'ETH-SIDA-250' },
      { weightGrams: 1000, priceCents: 3900, sku: 'ETH-SIDA-1000' },
    ],
  },
  {
    name: 'Guji Honey',
    description: 'Syrupy sweetness with notes of stone fruit and caramel.',
    roastLevel: 'medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'honey',
    caffeine: 'regular',
    sensoryProfile: { body: 'full', acidity: 'medium', sweetness: 'high' },
    variants: [
      { weightGrams: 250, priceCents: 1300, sku: 'ETH-GUJI-250' },
      { weightGrams: 1000, priceCents: 4500, sku: 'ETH-GUJI-1000' },
    ],
  },
  {
    name: 'Harrar Classic',
    description: 'Bold and winey with a heavy body and dark chocolate finish.',
    roastLevel: 'dark',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'natural',
    caffeine: 'regular',
    sensoryProfile: { body: 'full', acidity: 'low', sweetness: 'medium' },
    variants: [
      { weightGrams: 250, priceCents: 1050, sku: 'ETH-HARR-250' },
      { weightGrams: 1000, priceCents: 3600, sku: 'ETH-HARR-1000' },
    ],
  },
  {
    name: 'Limu Decaf',
    description: 'Smooth and balanced, all the flavor without the caffeine.',
    roastLevel: 'medium',
    grind: 'whole-bean',
    origin: 'Ethiopia',
    process: 'washed',
    caffeine: 'decaf',
    sensoryProfile: { body: 'medium', acidity: 'medium', sweetness: 'medium' },
    variants: [
      { weightGrams: 250, priceCents: 1250, sku: 'ETH-LIMU-DECAF-250' },
    ],
  },
];

async function main() {
  let created = 0;
  for (const { variants, ...product } of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });
    if (existing) continue;

    await prisma.product.create({
      data: {
        ...product,
        variants: { create: variants },
      },
    });
    created += 1;
  }

  console.log(`Seeded ${created} new product(s) (${products.length - created} already present).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
