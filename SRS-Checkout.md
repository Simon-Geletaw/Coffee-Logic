# **Checkout**

## Overview
The Checkout subsystem enables one-time and subscription purchases with Stripe, capturing payment, shipping details, and creating orders reliably. It prioritizes high success rates and safe retry behavior.

## Functional Requirements
- **FR-CO-001** The system shall create a checkout session for one-time purchases and subscriptions.
- **FR-CO-002** The system shall calculate shipping cost based on weight tiers or configured rules.
- **FR-CO-003** The system shall process Stripe webhooks to confirm payment status and update order state.
- **FR-CO-004** The system shall create an order record upon successful payment authorization.
- **FR-CO-005** The system shall support Apple Pay, Google Pay, and major credit cards via Stripe.
- **FR-CO-006** The system shall handle payment failures and display actionable error messaging.
- **FR-CO-007** The system shall store an idempotency key per checkout to prevent duplicate charges.

## Acceptance Criteria
- **FR-CO-001**
  - Checkout session includes cart items, pricing, and selected purchase mode.
  - Subscription checkout requires a valid cadence selection.
- **FR-CO-002**
  - Shipping cost is calculated from total weight and applied to the checkout total.
  - Shipping rules are consistent across storefront and checkout.
- **FR-CO-003**
  - Webhook signature is validated before processing.
  - Payment success updates order status within 1 minute.
- **FR-CO-004**
  - Orders are created only after confirmed payment.
  - Duplicate webhook events do not create duplicate orders.
- **FR-CO-005**
  - Payment methods displayed match Stripe configuration for the region.
- **FR-CO-006**
  - Failed payments show a clear error with retry guidance.
  - Payment failure does not create an order.
- **FR-CO-007**
  - Each checkout request includes a unique idempotency key.
  - Replayed checkout requests do not create duplicate charges.

## Non-Functional Requirements
- Performance: checkout init responds within 500ms p95 excluding Stripe latency.
- Availability: checkout endpoints meet 99.9% monthly uptime.
- Security: PCI scope minimized via Stripe Elements; webhook events are signature-validated.
- Reliability: webhook processing is idempotent and safe to retry.
