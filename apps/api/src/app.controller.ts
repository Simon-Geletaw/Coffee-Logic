import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { stat } from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('health')
  healthCheck(){
    return {status:'ok'}
  }
  @Get('products')
  GetProducts(){
    return [
      { id: 1, name: 'Ethiopia Yirgacheffe', roast: 'Light' },
      { id: 2, name: 'Colombia Supremo', roast: 'Medium' },
      { id: 3, name: 'Sumatra Mandheling', roast: 'Dark' },
    ]
  }
}
