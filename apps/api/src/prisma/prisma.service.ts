import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CONNECT_MAX_RETRIES = 5;
const CONNECT_RETRY_DELAY_MS = 3_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Cloud Postgres (Render, Neon, ...) can be briefly unreachable right
    // after a deploy or cold start. A single $connect() failure would crash
    // the whole API and put the service into a crash loop / failed health
    // check, so retry with a short backoff before giving up.
    for (let attempt = 1; attempt <= CONNECT_MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        if (attempt === CONNECT_MAX_RETRIES) {
          throw error;
        }
        this.logger.warn(
          `Database not reachable (attempt ${attempt}/${CONNECT_MAX_RETRIES}), retrying in ${CONNECT_RETRY_DELAY_MS / 1000}s...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, CONNECT_RETRY_DELAY_MS),
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
