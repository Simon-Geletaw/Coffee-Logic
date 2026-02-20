# Software Requirements Specification (SRS) — Coffee Logic

## 1. Purpose
This document captures the functional and non-functional requirements for the Coffee Logic platform, traces them back to the BRD, and provides acceptance criteria for the MVP and subsequent phases.

How to read this document (beginner-friendly)
- Start with Section 2 (Scope) to understand what is in and out.
- Read Section 6 to see what features we must build.
- Use Section 10 (Acceptance Tests) to confirm your work is done.
- If a requirement mentions FR-*, find that ID in Section 6.

## 2. Scope
- Storefront (product discovery, filtering, PWA)
- Subscription engine (Stripe Billing lifecycle)
- Inventory & Freshness management (roast_date, batch tracking)
- Checkout/payment reliability
- Admin interfaces and alerts

## 3. Stakeholders
- Product Owner: Simon Geletaw
- Lead Developer / Architect
- Frontend Engineers
- Backend Engineers (TS + Go)
- DevOps / SRE
- QA / Test Automation

## 4. Definitions & Acronyms
- SRS, BRD, SSR, PWA, SLO, SLA, API, CDN, TTL

## 5. Overall Description
- System context diagram (links to `docs/architecture.mmd` if present)
- High-level components: Next.js (UI), NestJS (orchestrator), Go microservices (selection/inventory/checkout), Postgres, ES, Redis, Stripe.

## 6. Functional Requirements (grouped)
- FR-01: Product catalog (list, detail, images, sensory attributes).
  - AC: Products display with correct sensory fields; SSR pages render under 800ms on average in staging.
- FR-02: Filtering and selection logic (faceted filters, ranking engine).
  - AC: Filter results match expected dataset queries and return within latency budget (see NFRs).
- FR-03: Subscriptions (create, pause, cancel, billing webhooks).
  - AC: Stripe subscription created; DB reflects subscription state on webhook.
- FR-04: Checkout (one-time and subscription flows, Cards, Apple Pay, Google Pay).
  - AC: 99.9% success target for authorized payments in normal conditions.
- FR-05: Inventory and freshness (roast_date, peak window, batch lifecycle management).
  - AC: Products outside peak window flagged; admin can view batch lifecycle.

## 6.1 Subsystem Requirements

### Storefront
Overview: The Storefront enables customers to discover, compare, and select coffees through clear product presentation and attribute-based filtering, supporting confident add-to-cart decisions.

#### Functional Requirements
- FR-SF-001 The system shall allow users to browse the catalog by categories and view product listings.
- FR-SF-002 The system shall allow users to filter products by roast level, grind, weight, acidity, origin, caffeine, and process, and update the catalog results accordingly.
- FR-SF-003 The system shall provide product detail pages that show images, sensory profiles, price, and availability.

#### Acceptance Criteria
- FR-SF-001
  - If no products in category, the UI shows a clear empty message.
  - Category list loads and displays at least 3 categories.
- FR-SF-002
  - Filter results match the selected attributes (roast level, grind, weight, acidity, origin, caffeine, process).
  - Filter errors are logged and do not break the UI.
- FR-SF-003
  - If a product is out of stock, the availability state is visible.
  - Product detail page displays images, sensory profile, price, and availability.

#### Non-Functional Requirements
- Performance: storefront pages render in under 1.0s p95 on SSR for cached content in staging.
- Availability: storefront browsing endpoints meet 99.9% uptime monthly.
- Accessibility: key storefront pages meet WCAG 2.1 AA for keyboard navigation and contrast.
- Security: session cookies use Secure and SameSite=Lax, and state-changing actions include CSRF protection.
- Reliability: filter and category pages handle empty states without errors or broken layout.

### Subscriptions
Overview: Subscriptions allow customers to schedule recurring deliveries with selectable cadence, while still supporting one-time purchases.

#### Functional Requirements
- FR-Subs-001 The system shall provide a product page toggle between one-time purchase and subscription.
- FR-Subs-002 If subscription is selected, the system shall require a delivery cadence (every 7 days, every 14 days, or monthly).
- FR-Subs-003 The system shall allow authenticated users to pause, resume, or cancel subscriptions through a secure My Account portal.
- FR-Subs-004 The system shall email customers a reminder before each subscription charge (3 days prior).

#### Acceptance Criteria
- FR-Subs-001
  - Toggle between one-time purchase and subscription is visible on product pages.
  - Selected purchase mode persists into cart and checkout.
  - Switching modes updates price and checkout intent accordingly.
- FR-Subs-002
  - Subscription cadence selection is required before checkout.
  - Allowed cadences are limited to 7 days, 14 days, and monthly.
  - Selected cadence is stored with the subscription record.
- FR-Subs-003
  - Authenticated users can pause, resume, and cancel from My Account.
  - Changes are reflected in the subscription status within 1 minute.
  - The system prevents billing while a subscription is paused.
- FR-Subs-004
  - Reminder email is sent 3 days before each subscription charge.
  - Email includes product name, cadence, and next charge date.
  - Failed email delivery is logged for retry.

#### Non-Functional Requirements
- Performance: subscription management actions respond within 500ms p95 (excluding Stripe latency).
- Availability: subscription management endpoints meet 99.9% monthly uptime.
- Security: subscription actions require authenticated sessions; webhook events are signature-validated.
- Reliability: webhook processing is idempotent and safe to retry.

### Checkout
Overview: The Checkout subsystem enables one-time and subscription purchases with Stripe, capturing payment, shipping details, and creating orders reliably.

#### Functional Requirements
- FR-CO-001 The system shall create a checkout session for one-time purchases and subscriptions.
- FR-CO-002 The system shall calculate shipping cost based on weight tiers or configured rules.
- FR-CO-003 The system shall process Stripe webhooks to confirm payment status and update order state.
- FR-CO-004 The system shall create an order record upon successful payment authorization.
- FR-CO-005 The system shall support Apple Pay, Google Pay, and major credit cards via Stripe.
- FR-CO-006 The system shall handle payment failures and display actionable error messaging.
- FR-CO-007 The system shall store an idempotency key per checkout to prevent duplicate charges.

#### Acceptance Criteria
- FR-CO-001
  - Checkout session includes cart items, pricing, and selected purchase mode.
  - Subscription checkout requires a valid cadence selection.
- FR-CO-002
  - Shipping cost is calculated from total weight and applied to the checkout total.
  - Shipping rules are consistent across storefront and checkout.
- FR-CO-003
  - Webhook signature is validated before processing.
  - Payment success updates order status within 1 minute.
- FR-CO-004
  - Orders are created only after confirmed payment.
  - Duplicate webhook events do not create duplicate orders.
- FR-CO-005
  - Payment methods displayed match Stripe configuration for the region.
- FR-CO-006
  - Failed payments show a clear error with retry guidance.
  - Payment failure does not create an order.
- FR-CO-007
  - Each checkout request includes a unique idempotency key.
  - Replayed checkout requests do not create duplicate charges.

#### Non-Functional Requirements
- Performance: checkout init responds within 500ms p95 excluding Stripe latency.
- Availability: checkout endpoints meet 99.9% monthly uptime.
- Security: PCI scope minimized via Stripe Elements; webhook events are signature-validated.
- Reliability: webhook processing is idempotent and safe to retry.

### Inventory
Overview: The Inventory subsystem tracks roast batches, available quantities, and freshness windows to ensure only in-peak coffee is shown and fulfillment remains accurate.

#### Functional Requirements
- FR-Inv-001 The system shall record batches with roast date, batch ID, and product association.
- FR-Inv-002 The system shall compute a configurable peak flavor window (default 7-21 days post-roast) and flag batches as in-peak or out-of-peak.
- FR-Inv-003 The system shall track on-hand and reserved quantities per batch and product.
- FR-Inv-004 The system shall trigger low-stock alerts when thresholds are met.
- FR-Inv-005 The system shall update product visibility based on batch freshness and available quantity (in-peak and quantity > 0).
- FR-Inv-006 The system shall reserve inventory during checkout and release it on payment failure or cancellation.

#### Acceptance Criteria
- FR-Inv-001
  - A batch record includes batch ID, roast date, and product ID.
  - Batch data is retrievable by product and batch ID.
- FR-Inv-002
  - Peak window start and end dates are computed from the configured window (default 7 and 21 days).
  - Batches outside the window are marked out-of-peak.
- FR-Inv-003
  - Inventory quantity decreases on order creation and increases on restock.
  - Reserved quantity is released when an order is canceled.
- FR-Inv-004
  - Low-stock alerts are generated when quantity falls below a configured threshold.
  - Alerts include product, batch, and remaining quantity.
- FR-Inv-005
  - Out-of-peak or out-of-stock batches do not appear as available in the storefront.
  - Out-of-peak batches remain visible to admins for management.
  - Visibility updates propagate within 5 minutes of inventory change.
- FR-Inv-006
  - Reserved quantity is created when checkout is initiated.
  - Reservations are released when payment fails or an order is canceled.
  - Reservations are converted to decremented on-hand quantity after successful payment.

#### Non-Functional Requirements
- Performance: inventory queries respond within 200ms p95 for single product lookups.
- Availability: inventory endpoints meet 99.9% monthly uptime.
- Security: inventory updates require authenticated admin or service credentials.
- Reliability: inventory updates are idempotent and safe to retry; freshness window recalculation runs at least daily or on batch updates.

### Admin
Overview: The Admin subsystem allows staff to manage products, batches, inventory, orders, and alerts, ensuring operational control and accurate data across the platform.

#### Functional Requirements
- FR-Admin-001 The system shall allow admins to create, update, and archive products.
- FR-Admin-002 The system shall allow admins to create and manage roast batches.
- FR-Admin-003 The system shall allow admins to adjust inventory levels with audit logging.
- FR-Admin-004 The system shall allow admins to view orders and subscription status.
- FR-Admin-005 The system shall allow admins to configure low-stock thresholds and alert recipients.
- FR-Admin-006 The system shall provide an audit log view for admin actions with filters by date and actor.
- FR-Admin-007 The system shall allow role-based access control for admin features (viewer, operator, manager).

#### Acceptance Criteria
- FR-Admin-001
  - Product changes are visible in the storefront within 5 minutes.
  - Archived products are not shown in the storefront.
- FR-Admin-002
  - A batch can be created with roast date, batch ID, and linked product.
  - Batch edits are tracked in audit logs.
- FR-Admin-003
  - Inventory adjustments require a reason and are recorded in audit logs.
  - Adjustments update available quantity within 5 minutes.
- FR-Admin-004
  - Admins can view order status, payment status, and fulfillment state.
  - Subscription status is visible per user and order.
- FR-Admin-005
  - Low-stock thresholds can be set per product or batch.
  - Alerts are sent to configured recipients when thresholds are crossed.
- FR-Admin-006
  - Admins can filter audit logs by date range and admin user.
  - Audit log entries include action, timestamp, and target entity.
- FR-Admin-007
  - Users with viewer role can read data but cannot change it.
  - Users with manager role can perform all admin actions.

#### Non-Functional Requirements
- Performance: admin actions respond within 800ms p95.
- Availability: admin portal meets 99.5% monthly uptime.
- Security: admin access requires authenticated role-based access control.
- Compliance: all admin mutations are audit logged with user and timestamp.

### User & Auth
Overview: The User and Auth subsystem provides secure account access, session management, and address storage for checkout and subscriptions.

#### Functional Requirements
- FR-Auth-001 The system shall support sign-in using email/password and OAuth providers.
- FR-Auth-002 The system shall maintain authenticated sessions for storefront, checkout, and account management.
- FR-Auth-003 The system shall allow users to reset passwords via email-based token flow.
- FR-Auth-004 The system shall allow users to manage a saved address book.
- FR-Auth-005 The system shall protect sensitive actions with session validation and CSRF protection.
- FR-Auth-006 The system shall allow users to sign out and invalidate active sessions.

#### Acceptance Criteria
- FR-Auth-001
  - Users can sign in with valid credentials or OAuth.
  - Invalid credentials return a clear error message.
- FR-Auth-002
  - Sessions persist across browser reloads within the configured TTL.
  - Expired sessions require re-authentication.
- FR-Auth-003
  - Password reset emails include a single-use token with an expiry.
  - Password reset tokens cannot be reused.
- FR-Auth-004
  - Users can add, edit, and delete saved addresses.
  - At least one address can be marked as default.
- FR-Auth-005
  - State-changing requests require a valid session and CSRF token.
  - Failed validations do not change user data.
- FR-Auth-006
  - Signing out invalidates the active session token.
  - Signed-out sessions cannot access protected routes.

#### Non-Functional Requirements
- Performance: auth endpoints respond within 300ms p95.
- Availability: auth services meet 99.9% monthly uptime.
- Security: passwords are hashed with a strong adaptive hash; session cookies are Secure and SameSite=Lax; authentication endpoints enforce rate limiting for failed sign-in attempts.
- Reliability: auth state changes are logged for security monitoring.

## 7. Non-Functional Requirements (NFRs)
- NFR-Perf-01: 95th percentile storefront API latency < 200ms for cached queries.
- NFR-Perf-02: Checkout API P99 latency < 500ms (excluding external payment provider latencies).
- NFR-Avail-01: 99.9% availability for checkout flows (measured monthly).
- NFR-Sec-01: PCI scope minimized via Stripe; webhooks validated; TLS enforced.
- NFR-Scale-01: Able to handle 10k concurrent sessions with autoscaling.

## 8. Data Model & Persistence
- Core entities: `Product`, `Batch`, `Inventory`, `User`, `Order`, `Subscription`.
- Key fields: `Batch.roast_date`, `Batch.batch_id`, `Product.sensory_profile` (JSONB), `Inventory.available`.

## 9. APIs & Interfaces
- Public REST: product list/detail, search, checkout init, subscription management. OpenAPI spec generated by NestJS.
- Internal gRPC: selection.MatchProducts, inventory.GetBatchStatus, checkout.ProcessWebhook.
- Event streams: Redis streams or NATS for inventory updates, subscription events.

## 10. Acceptance Tests & Traceability
This section links requirements to BRD scope and acceptance tests to keep delivery aligned with business goals.

### 10.1 Traceability Matrix (FR ↔ BRD ↔ Tests)
| Requirement | BRD Reference | Acceptance Tests |
| --- | --- | --- |
| FR-01 | Chapter 3.1.1 Storefront Module | AT-SF-001, AT-SF-002 |
| FR-02 | Chapter 1.2 Selection Logic; Chapter 3.1.1 Storefront Module | AT-SF-003 |
| FR-03 | Chapter 3.1.2 Subscription Engine | AT-Subs-001, AT-Subs-002 |
| FR-04 | Chapter 3.1.5 Payment & Logistics Gateway | AT-CO-001, AT-CO-002 |
| FR-05 | Chapter 1.2 Freshness Logic; Chapter 3.1.3 Inventory System | AT-Inv-001, AT-Inv-002 |
| FR-SF-001..003 | Chapter 3.1.1 Storefront Module | AT-SF-001..003 |
| FR-Subs-001..004 | Chapter 3.1.2 Subscription Engine | AT-Subs-001..003 |
| FR-CO-001..007 | Chapter 3.1.5 Payment & Logistics Gateway | AT-CO-001..003 |
| FR-Inv-001..006 | Chapter 3.1.3 Inventory System | AT-Inv-001..003 |
| FR-Admin-001..007 | Chapter 2 Stakeholder Profiles (Site Administrator); Chapter 3.1.3 Inventory System | AT-Admin-001..002 |
| FR-Auth-001..006 | Chapter 3.1.4 User Account & Security | AT-Auth-001..003 |

### 10.2 Acceptance Tests (system and subsystem)
- AT-SF-001 Browse catalog and categories with empty-state handling.
- AT-SF-002 Filter by attributes returns correct results.
- AT-SF-003 Product detail shows images, sensory profile, price, availability.
- AT-Subs-001 Create subscription with cadence selection and persisted mode.
- AT-Subs-002 Pause/resume/cancel from My Account updates status within 1 minute.
- AT-Subs-003 Reminder email sent 3 days prior to charge.
- AT-CO-001 Checkout session created for one-time and subscription flows.
- AT-CO-002 Stripe webhook updates order state within 1 minute and is idempotent.
- AT-CO-003 Shipping cost calculated by weight tiers consistently.
- AT-Inv-001 Batch recorded with roast date and product association.
- AT-Inv-002 Peak window calculation flags in-peak/out-of-peak correctly.
- AT-Inv-003 Inventory reservation and release behave across payment outcomes.
- AT-Admin-001 Inventory adjustments require reason and are audit logged.
- AT-Admin-002 Low-stock alerts fire to configured recipients.
- AT-Auth-001 Sign-in and OAuth succeed; invalid credentials return error.
- AT-Auth-002 Password reset token flow works once and expires.
- AT-Auth-003 Address book CRUD with default address.

## 11. Constraints & Assumptions
- Use Stripe as payment provider. Use managed Postgres and Redis. Vercel preferred for Next.js.

## 12. Appendices
- Link: `BRD.md` and `Business Requirements Document (BRD).pdf` in repo root.
- Subsystem SRS sources: `SRS-Admin.md`, `SRS-Checkout.md`, `SRS-Inventory.md`, `SRS-Storefront.md`, `SRS-Subscriptions.md`, `SRS-User-Auth.md`, `SRS-system.md`.
