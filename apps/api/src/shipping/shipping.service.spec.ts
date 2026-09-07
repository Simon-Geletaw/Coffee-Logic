import { Test } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Unit tests: Prisma is replaced by a hand-rolled fake so we test the tier
 * *selection rules*, not Postgres. The fake mirrors what the real query does
 * (filter + ascending sort) so boundary cases are meaningful.
 */
type Rate = {
  currency: 'ETB' | 'USD';
  maxGrams: number;
  cents: number;
  label: string;
  isActive: boolean;
};

const RATES: Rate[] = [
  {
    currency: 'ETB',
    maxGrams: 500,
    cents: 15000,
    label: 'Up to 500 g',
    isActive: true,
  },
  {
    currency: 'ETB',
    maxGrams: 2000,
    cents: 25000,
    label: 'Up to 2 kg',
    isActive: true,
  },
  {
    currency: 'ETB',
    maxGrams: 1_000_000,
    cents: 40000,
    label: 'Over 2 kg',
    isActive: true,
  },
  // A retired cheaper tier that must never be picked.
  {
    currency: 'ETB',
    maxGrams: 3000,
    cents: 1,
    label: 'Retired promo',
    isActive: false,
  },
  {
    currency: 'USD',
    maxGrams: 500,
    cents: 800,
    label: 'Up to 500 g',
    isActive: true,
  },
];

function makePrismaFake(rates: Rate[]) {
  return {
    shippingRate: {
      findFirst: jest.fn(
        (args: {
          where: {
            currency: string;
            isActive: boolean;
            maxGrams: { gte: number };
          };
          orderBy: { maxGrams: 'asc' };
        }) => {
          const matches = rates
            .filter(
              (rate) =>
                rate.currency === args.where.currency &&
                rate.isActive === args.where.isActive &&
                rate.maxGrams >= args.where.maxGrams.gte,
            )
            .sort((a, b) => a.maxGrams - b.maxGrams);
          const first = matches[0];
          return first ? { cents: first.cents, label: first.label } : null;
        },
      ),
    },
  };
}

describe('ShippingService.quote', () => {
  let service: ShippingService;
  let prisma: ReturnType<typeof makePrismaFake>;

  beforeEach(async () => {
    prisma = makePrismaFake(RATES);
    const module = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ShippingService);
  });

  it('returns zero for an empty cart without querying the database', async () => {
    await expect(service.quote('ETB', 0)).resolves.toEqual({
      cents: 0,
      label: 'No shipping',
    });
    expect(prisma.shippingRate.findFirst).not.toHaveBeenCalled();
  });

  it('picks the tightest tier whose ceiling covers the weight', async () => {
    await expect(service.quote('ETB', 250)).resolves.toEqual({
      cents: 15000,
      label: 'Up to 500 g',
    });
  });

  it('treats the ceiling as inclusive: exactly 500 g is still the first tier', async () => {
    await expect(service.quote('ETB', 500)).resolves.toMatchObject({
      cents: 15000,
    });
  });

  it('crosses into the next tier one gram past the ceiling', async () => {
    await expect(service.quote('ETB', 501)).resolves.toMatchObject({
      cents: 25000,
    });
  });

  it('falls into the sentinel top tier for very heavy carts', async () => {
    await expect(service.quote('ETB', 12_000)).resolves.toMatchObject({
      cents: 40000,
    });
  });

  it('never selects an inactive tier even when it is cheaper', async () => {
    // 2500 g: the retired 3000 g promo (1 cent) would win if isActive were ignored.
    await expect(service.quote('ETB', 2500)).resolves.toMatchObject({
      cents: 40000,
    });
  });

  it('scopes tiers by currency', async () => {
    await expect(service.quote('USD', 100)).resolves.toMatchObject({
      cents: 800,
    });
  });

  it('throws 422 when no tier covers the weight in that currency', async () => {
    // USD has no tier above 500 g in the fixture.
    await expect(service.quote('USD', 501)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('queries only active tiers at or above the weight, ascending', async () => {
    await service.quote('ETB', 700);
    expect(prisma.shippingRate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { currency: 'ETB', isActive: true, maxGrams: { gte: 700 } },
        orderBy: { maxGrams: 'asc' },
      }),
    );
  });
});
