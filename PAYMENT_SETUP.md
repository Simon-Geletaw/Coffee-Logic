# Payment checkout

Set `WEB_ORIGIN` to the storefront URL and `API_PUBLIC_URL` to the externally
reachable API URL. Both should use HTTPS in production.

- Chapa: configure `CHAPA_SECRET_KEY` and `CHAPA_WEBHOOK_SECRET`. Register
  `POST /payments/chapa/webhook` in the Chapa dashboard with the same webhook
  secret. Checkout separately sends `/payments/chapa/callback` as its transaction
  callback URL. Callback and browser return requests verify the transaction with
  Chapa before marking an order paid.
- Stripe: configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Register
  `POST /payments/stripe/webhook` for `checkout.session.completed` and
  `checkout.session.async_payment_succeeded`. The return page also verifies the
  session, so a delayed webhook does not leave the shopper waiting indefinitely.

Missing provider credentials produce a checkout error and preserve the cart.
Provider initialization failures restore the cart for retry. A successful
initialization returns a hosted payment URL and releases the cart token.

Payment confirmation verifies the server's order total and currency. Stock and
paid status update in one transaction; duplicate confirmation requests do not
deduct stock twice. Inventory is still shared by product, in units, and is not
reserved while the customer pays. If stock runs out before confirmation, the
transaction stays unfulfilled and reports a reconciliation error. Reconcile stock
and retry verification, or handle a refund through the provider.

Before accepting live payments, test each provider with sandbox credentials:
checkout redirect, successful payment, cancellation, provider error, browser
return, and repeated webhook delivery. Automated tests mock providers; they do
not prove that deployed credentials, account capabilities, or public webhook
URLs are configured correctly. Existing pending orders created without a payment
reference require manual reconciliation.

Provider references: [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions),
[Chapa webhooks](https://developer.chapa.co/integrations/webhooks), and
[Chapa payment verification](https://developer.chapa.co/integrations/verify-payments).
