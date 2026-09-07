import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { ChapaProvider } from './chapa.provider';

const WEBHOOK_SECRET = 'chapa-webhook-secret-for-tests';

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function sign(body: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('ChapaProvider', () => {
  let provider: ChapaProvider;

  beforeEach(() => {
    provider = new ChapaProvider(
      makeConfig({
        CHAPA_SECRET_KEY: 'CHASECK_TEST-x',
        CHAPA_WEBHOOK_SECRET: WEBHOOK_SECRET,
      }),
    );
  });

  it('handles ETB only', () => {
    expect(provider.supports('ETB')).toBe(true);
    expect(provider.supports('USD')).toBe(false);
  });

  describe('unit conversion', () => {
    it('formats minor units as a two-decimal major-unit string', () => {
      expect(ChapaProvider.toMajorUnits(65000)).toBe('650.00');
      expect(ChapaProvider.toMajorUnits(5)).toBe('0.05');
    });

    it('parses major units from strings and numbers back to minor units', () => {
      expect(ChapaProvider.toMinorUnits('650.00')).toBe(65000);
      expect(ChapaProvider.toMinorUnits(650)).toBe(65000);
      // Float noise: 0.1 + 0.2 style inputs must round, not truncate.
      expect(ChapaProvider.toMinorUnits('19.99')).toBe(1999);
    });

    it('returns undefined for missing or garbage amounts', () => {
      expect(ChapaProvider.toMinorUnits(undefined)).toBeUndefined();
      expect(ChapaProvider.toMinorUnits('')).toBeUndefined();
      expect(ChapaProvider.toMinorUnits('abc')).toBeUndefined();
    });
  });

  describe('signatureMatches', () => {
    const body = Buffer.from('{"tx_ref":"abc","status":"success"}');

    it('accepts the correct HMAC', () => {
      expect(
        ChapaProvider.signatureMatches(
          body,
          WEBHOOK_SECRET,
          sign(body.toString()),
        ),
      ).toBe(true);
    });

    it('is case-insensitive on the hex digest', () => {
      const upper = sign(body.toString()).toUpperCase();
      expect(ChapaProvider.signatureMatches(body, WEBHOOK_SECRET, upper)).toBe(
        true,
      );
    });

    it('rejects a digest computed with another secret', () => {
      expect(
        ChapaProvider.signatureMatches(
          body,
          WEBHOOK_SECRET,
          sign(body.toString(), 'other'),
        ),
      ).toBe(false);
    });

    it('rejects a digest of a different length without throwing', () => {
      expect(
        ChapaProvider.signatureMatches(body, WEBHOOK_SECRET, 'deadbeef'),
      ).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('accepts x-chapa-signature and maps a success payload to paid', async () => {
      const body = JSON.stringify({
        event: 'charge.success',
        status: 'success',
        tx_ref: 'mlk-1',
        amount: '650.00',
        currency: 'ETB',
      });

      const event = await provider.verifyWebhook(Buffer.from(body), {
        'x-chapa-signature': sign(body),
      });

      expect(event).toMatchObject({
        eventId: 'chapa:mlk-1:charge.success',
        type: 'paid',
        providerRef: 'mlk-1',
        amountCents: 65000,
        currency: 'ETB',
      });
    });

    it('also accepts the Chapa-Signature header variant', async () => {
      const body = JSON.stringify({ status: 'success', tx_ref: 'mlk-2' });
      const event = await provider.verifyWebhook(Buffer.from(body), {
        'chapa-signature': sign(body),
      });
      expect(event.type).toBe('paid');
    });

    it('rejects a missing signature', async () => {
      const body = JSON.stringify({ status: 'success', tx_ref: 'mlk-3' });
      await expect(
        provider.verifyWebhook(Buffer.from(body), {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a bad signature', async () => {
      const body = JSON.stringify({ status: 'success', tx_ref: 'mlk-4' });
      await expect(
        provider.verifyWebhook(Buffer.from(body), {
          'x-chapa-signature': sign(body, 'nope'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects malformed JSON even when correctly signed', async () => {
      const body = '{not json';
      await expect(
        provider.verifyWebhook(Buffer.from(body), {
          'x-chapa-signature': sign(body),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails closed when the webhook secret is not configured', async () => {
      const unconfigured = new ChapaProvider(
        makeConfig({ CHAPA_SECRET_KEY: 'CHASECK_TEST-x' }),
      );
      const body = JSON.stringify({ status: 'success', tx_ref: 'mlk-5' });
      await expect(
        unconfigured.verifyWebhook(Buffer.from(body), {
          'x-chapa-signature': sign(body),
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('toWebhookEvent (mapping)', () => {
    it('maps failed and cancelled to failed', () => {
      expect(
        ChapaProvider.toWebhookEvent({ status: 'failed', tx_ref: 'a' }).type,
      ).toBe('failed');
      expect(
        ChapaProvider.toWebhookEvent({ status: 'cancelled', tx_ref: 'a' }).type,
      ).toBe('failed');
      expect(
        ChapaProvider.toWebhookEvent({ event: 'charge.failed', tx_ref: 'a' })
          .type,
      ).toBe('failed');
    });

    it('maps unknown statuses to ignored', () => {
      expect(
        ChapaProvider.toWebhookEvent({ status: 'pending', tx_ref: 'a' }).type,
      ).toBe('ignored');
      expect(ChapaProvider.toWebhookEvent({}).type).toBe('ignored');
    });

    it('derives a stable eventId so redeliveries de-duplicate', () => {
      const a = ChapaProvider.toWebhookEvent({
        status: 'success',
        tx_ref: 'x',
      });
      const b = ChapaProvider.toWebhookEvent({
        status: 'success',
        tx_ref: 'x',
      });
      expect(a.eventId).toBe(b.eventId);
    });
  });
});
