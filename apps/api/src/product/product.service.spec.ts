import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductService filters', () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const service = new ProductService({
    product: { findMany },
  } as unknown as PrismaService);
  beforeEach(() => findMany.mockClear());

  it('combines trimmed, case-insensitive filters and partial origin searches', async () => {
    await service.getProducts({
      name: '  coffee ',
      origin: ' ethi ',
      roastLevel: 'Light',
      grind: 'Espresso',
      process: 'Washed',
      caffeine: 'Regular',
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          name: { contains: 'coffee', mode: 'insensitive' },
          origin: { contains: 'ethi', mode: 'insensitive' },
          roastLevel: { equals: 'Light', mode: 'insensitive' },
          grind: { equals: 'Espresso', mode: 'insensitive' },
          process: { equals: 'Washed', mode: 'insensitive' },
          caffeine: { equals: 'Regular', mode: 'insensitive' },
        },
      }),
    );
  });

  it('ignores empty filters and returns descriptions for editing', async () => {
    findMany.mockResolvedValueOnce([
      { id: 'coffee', description: 'Preserve this description' },
    ]);
    const products = await service.getProducts({ name: '  ', origin: '' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(products[0].description).toBe('Preserve this description');
  });
  it('matches spaced admin labels against imported slug values', async () => {
    await service.getProducts({ grind: 'Whole Bean', roastLevel: 'light-medium' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      isActive: true,
      AND: [
        { OR: [
          { roastLevel: { equals: 'light-medium', mode: 'insensitive' } },
          { roastLevel: { equals: 'light medium', mode: 'insensitive' } },
          { roastLevel: { equals: 'light_medium', mode: 'insensitive' } },
        ] },
        { OR: [
          { grind: { equals: 'Whole Bean', mode: 'insensitive' } },
          { grind: { equals: 'Whole-Bean', mode: 'insensitive' } },
          { grind: { equals: 'Whole_Bean', mode: 'insensitive' } },
        ] },
      ],
    } }));
  });

});
