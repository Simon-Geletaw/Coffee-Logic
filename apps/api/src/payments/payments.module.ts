import { Module } from '@nestjs/common';
import { ChapaProvider } from './chapa.provider';
import { FakePaymentProvider } from './fake.provider';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { StripeProvider } from './stripe.provider';

/**
 * Provider drivers only. The webhook endpoint lives in CheckoutModule because
 * it needs the checkout state machine; keeping it here would create a cycle.
 */
@Module({
  providers: [
    StripeProvider,
    ChapaProvider,
    FakePaymentProvider,
    PaymentProviderRegistry,
  ],
  exports: [PaymentProviderRegistry, FakePaymentProvider],
})
export class PaymentsModule {}
