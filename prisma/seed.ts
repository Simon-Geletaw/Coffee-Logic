import { PrismaClient } from '@prisma/client';

/**
 * Development / CI seed. Safe to run repeatedly: every section looks before
 * it writes, so a second run changes nothing.
 *
 * Run with:  pnpm prisma db seed
 * (wired in prisma.config.ts -> migrations.seed)
 */
const prisma = new PrismaClient();

type SeedVariant = {
  weightGrams: number;
  priceCents: number;
  currency: 'ETB' | 'USD';
  sku: string;
};

type SeedProduct = {
  name: string;
  description: string;
  roastLevel: string;
  grind: string;
  origin: string;
  process: string;
  caffeine: string;
  sensoryProfile: Record<string, string>;
  variants: SeedVariant[];
};

// Prices are minor units: USD cents, ETB santim. 65000 santim = 650 Br.
const products: SeedProduct[] = [
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
      { weightGrams: 250, priceCents: 1200, currency: 'USD', sku: 'ETH-YIRG-250-USD' },
      { weightGrams: 1000, priceCents: 4200, currency: 'USD', sku: 'ETH-YIRG-1000-USD' },
      { weightGrams: 250, priceCents: 65000, currency: 'ETB', sku: 'ETH-YIRG-250-ETB' },
      { weightGrams: 1000, priceCents: 230000, currency: 'ETB', sku: 'ETH-YIRG-1000-ETB' },
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
      { weightGrams: 250, priceCents: 1100, currency: 'USD', sku: 'ETH-SIDA-250-USD' },
      { weightGrams: 1000, priceCents: 3900, currency: 'USD', sku: 'ETH-SIDA-1000-USD' },
      { weightGrams: 250, priceCents: 60000, currency: 'ETB', sku: 'ETH-SIDA-250-ETB' },
      { weightGrams: 1000, priceCents: 210000, currency: 'ETB', sku: 'ETH-SIDA-1000-ETB' },
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
      { weightGrams: 250, priceCents: 1300, currency: 'USD', sku: 'ETH-GUJI-250-USD' },
      { weightGrams: 1000, priceCents: 4500, currency: 'USD', sku: 'ETH-GUJI-1000-USD' },
      { weightGrams: 250, priceCents: 70000, currency: 'ETB', sku: 'ETH-GUJI-250-ETB' },
      { weightGrams: 1000, priceCents: 245000, currency: 'ETB', sku: 'ETH-GUJI-1000-ETB' },
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
      { weightGrams: 250, priceCents: 1050, currency: 'USD', sku: 'ETH-HARR-250-USD' },
      { weightGrams: 1000, priceCents: 3600, currency: 'USD', sku: 'ETH-HARR-1000-USD' },
      { weightGrams: 250, priceCents: 55000, currency: 'ETB', sku: 'ETH-HARR-250-ETB' },
      { weightGrams: 1000, priceCents: 195000, currency: 'ETB', sku: 'ETH-HARR-1000-ETB' },
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
      { weightGrams: 250, priceCents: 1250, currency: 'USD', sku: 'ETH-LIMU-DECAF-250-USD' },
      { weightGrams: 250, priceCents: 68000, currency: 'ETB', sku: 'ETH-LIMU-DECAF-250-ETB' },
    ],
  },
];

// The top tier uses a sentinel ceiling so "maxGrams >= weight" always finds a
// row; that is simpler and more testable than a nullable "no ceiling".
const shippingRates = [
  { currency: 'ETB', maxGrams: 500, cents: 15000, label: 'Up to 500 g' },
  { currency: 'ETB', maxGrams: 2000, cents: 25000, label: 'Up to 2 kg' },
  { currency: 'ETB', maxGrams: 1_000_000, cents: 40000, label: 'Over 2 kg' },
  { currency: 'USD', maxGrams: 500, cents: 800, label: 'Up to 500 g' },
  { currency: 'USD', maxGrams: 2000, cents: 1400, label: 'Up to 2 kg' },
  { currency: 'USD', maxGrams: 1_000_000, cents: 2500, label: 'Over 2 kg' },
] as const;

const SEED_STOCK_UNITS = 50;

async function seedProducts() {
  let createdProducts = 0;
  let createdVariants = 0;

  for (const { variants, ...product } of products) {
    // Products are matched by name; the earlier seed created them without
    // currencies, so re-running must attach variants to those existing rows.
    let row = await prisma.product.findFirst({
      where: { name: product.name },
      select: { id: true },
    });

    if (!row) {
      row = await prisma.product.create({
        data: product,
        select: { id: true },
      });
      createdProducts += 1;
    }

    for (const variant of variants) {
      const exists = await prisma.productVariant.findFirst({
        where: { sku: variant.sku },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.productVariant.create({
        data: { ...variant, productId: row.id },
      });
      createdVariants += 1;
    }
  }

  console.log(
    `Products: ${createdProducts} created, variants: ${createdVariants} created.`,
  );
}

async function seedShippingRates() {
  for (const rate of shippingRates) {
    // upsert on the compound unique key so re-runs update prices in place.
    await prisma.shippingRate.upsert({
      where: {
        currency_maxGrams: { currency: rate.currency, maxGrams: rate.maxGrams },
      },
      update: { cents: rate.cents, label: rate.label, isActive: true },
      create: rate,
    });
  }
  console.log(`Shipping rates: ${shippingRates.length} upserted.`);
}

async function seedInventory() {
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true },
  });

  let created = 0;
  for (const product of allProducts) {
    const batchCode = `SEED-${product.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;

    const existing = await prisma.batch.findFirst({
      where: { batchCode },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.batch.create({
      data: {
        productId: product.id,
        batchCode,
        roastDate: new Date(),
        inventory: {
          create: {
            onHand: SEED_STOCK_UNITS,
            reserved: 0,
            available: SEED_STOCK_UNITS,
          },
        },
      },
    });
    created += 1;
  }

  console.log(`Inventory: ${created} batch(es) created with ${SEED_STOCK_UNITS} units each.`);
}

async function main() {
  await seedProducts();
  await seedShippingRates();
  await seedInventory();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
