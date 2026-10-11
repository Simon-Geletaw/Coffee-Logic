import { NestFactory } from '@nestjs/core';
import type { Handler, NextFunction, Request, Response } from 'express';
import { createApp } from '../apps/api/src/create-app';

void NestFactory;

let handlerPromise: Promise<Handler> | undefined;

async function createHandler(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

export default async function handler(req: Request, res: Response) {
  handlerPromise ??= createHandler();
  const expressHandler = await handlerPromise;
  if (req.url?.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }
  const next: NextFunction = (error) => {
    if (error) {
      throw error;
    }
  };
  return expressHandler(req, res, next);
}
