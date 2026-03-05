import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ProductsModule, AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
