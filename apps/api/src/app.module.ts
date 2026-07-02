import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BatchesModule } from './batches/batches.module';
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
