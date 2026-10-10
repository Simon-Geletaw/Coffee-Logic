import { Test } from '@nestjs/testing';
import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrdersModule payment wiring', () => {
  it('resolves both payment providers through the imported PaymentsModule', async () => {
    const module = await Test.createTestingModule({ imports: [OrdersModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(module.get(OrdersService)).toBeDefined();
    await module.close();
  });
});
