import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BatchesModule } from './batches/batches.module';
import { InventoryModule } from './inventory/inventory.module';
import { CatalogModule } from './catalog/catalog.module';
import { VariantsModule } from './variants/variants.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { RedisModule } from './redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.config';
import { PrismaModule } from './prisma/prisma.modue';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core/constants';

@Module({
  imports: [
    ProductsModule,
    AuthModule,
    UserModule,
    BatchesModule,
    InventoryModule,
    CatalogModule,
    VariantsModule,
    OrdersModule,
    PaymentsModule,
    RedisModule,
    // Enables @Cron() decorators — used by the checkout hold sweeper.
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 6000,
        limit: 20,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    PrismaModule,
    ThrottlerGuard,
  ],
})
export class AppModule {}
