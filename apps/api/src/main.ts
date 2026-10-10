import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';

const LOGIN_RATE_LIMIT = {
  max: 5,
  windowMs: 6000,
};

const loginRequests = new Map<string, { count: number; windowStart: number }>();

async function bootstrap() {
  // rawBody keeps the unparsed request bytes on req.rawBody. Payment webhooks
  // are signed over those exact bytes, so verification must see them before
  // any JSON parsing touches the payload.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use('/auth/login', (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${ip}:auth-login`;
    const current = loginRequests.get(key);

    if (!current || now - current.windowStart >= LOGIN_RATE_LIMIT.windowMs) {
      loginRequests.set(key, { count: 1, windowStart: now });
      res.setHeader('X-RateLimit-Limit', LOGIN_RATE_LIMIT.max);
      res.setHeader('X-RateLimit-Remaining', LOGIN_RATE_LIMIT.max - 1);
      res.setHeader('X-RateLimit-Reset', LOGIN_RATE_LIMIT.windowMs);
      return next();
    }

    if (current.count >= LOGIN_RATE_LIMIT.max) {
      const retryAfterMs =
        LOGIN_RATE_LIMIT.windowMs - (now - current.windowStart);
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
        error: 'Too Many Requests',
      });
    }

    current.count += 1;
    loginRequests.set(key, current);
    res.setHeader('X-RateLimit-Limit', LOGIN_RATE_LIMIT.max);
    res.setHeader(
      'X-RateLimit-Remaining',
      LOGIN_RATE_LIMIT.max - current.count,
    );
    res.setHeader(
      'X-RateLimit-Reset',
      Math.max(1, LOGIN_RATE_LIMIT.windowMs - (now - current.windowStart)),
    );
    return next();
  });
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    // Production allows exactly the storefront origin. Dev keeps the local
    // ports so Vite/Next previews still work.
    origin:
      process.env.NODE_ENV === 'production'
        ? [webOrigin]
        : [
            webOrigin,
            'http://localhost:3001',
            'http://localhost:5173',
            'http://localhost:3000',
          ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on 0.0.0.0:${port}`);
}
void bootstrap();
