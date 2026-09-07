import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Currency } from '@prisma/client';
import { ChapaProvider } from './chapa.provider';
import { FakePaymentProvider } from './fake.provider';
import { StripeProvider } from './stripe.provider';
import type {
  PaymentProvider,
  PaymentProviderName,
} from './payment-provider.interface';

/**
 * Chooses a driver. The rest of the app talks to this, never to a provider
 * class, so swapping the fake in for tests is a config flag, not a code path.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly real: PaymentProvider[];

  constructor(
    private readonly config: ConfigService,
    stripe: StripeProvider,
    chapa: ChapaProvider,
    private readonly fake: FakePaymentProvider,
  ) {
    this.real = [stripe, chapa];
  }

  private get useFake(): boolean {
    return this.config.get<boolean>('PAYMENTS_FAKE') === true;
  }

  /** Names the frontend may offer for this currency. */
  namesFor(currency: Currency): PaymentProviderName[] {
    return this.real.filter((p) => p.supports(currency)).map((p) => p.name);
  }

  /** Resolve by name for a given currency; 404 if that pairing is not offered. */
  resolve(name: PaymentProviderName, currency: Currency): PaymentProvider {
    if (!this.namesFor(currency).includes(name)) {
      throw new NotFoundException(
        `${name} is not available for ${currency} payments`,
      );
    }
    return this.useFake ? this.fake : this.real.find((p) => p.name === name)!;
  }

  /** For webhooks: the route says which provider is calling. */
  byRoute(route: string): PaymentProvider {
    if (route === 'fake') {
      if (!this.useFake) throw new NotFoundException();
      return this.fake;
    }
    const provider = this.real.find((p) => p.name === route);
    if (!provider)
      throw new NotFoundException(`Unknown payment provider ${route}`);
    return this.useFake ? this.fake : provider;
  }
}
