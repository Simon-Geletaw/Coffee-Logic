import { createApp } from './create-app';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  void NestFactory;
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on 0.0.0.0:${port}`);
}

void bootstrap();
