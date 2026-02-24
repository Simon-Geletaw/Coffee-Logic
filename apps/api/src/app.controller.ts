import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  @Get('products')
  async getProducts() {
    return (await this.prisma.product.findMany()).map((product) => ({
      id: product.id,
      name: product.name,
      roast: product.roastLevel,
    }));
  }
}