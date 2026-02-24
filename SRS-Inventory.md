# **Inventory**

## Overview
The Inventory subsystem tracks roast batches, available quantities, and freshness windows so only in-peak coffee is shown and fulfillment remains accurate. It also provides low-stock visibility for administrators and downstream services.

## Functional Requirements
- **FR-Inv-001** The system shall record batches with roast date, batch ID, and product association.
- **FR-Inv-002** The system shall compute a configurable peak flavor window (default 7-21 days post-roast) and flag batches as in-peak or out-of-peak.
- **FR-Inv-003** The system shall track on-hand and reserved quantities per batch and product.
- **FR-Inv-004** The system shall trigger low-stock alerts when thresholds are met.
- **FR-Inv-005** The system shall update product visibility based on batch freshness and available quantity (in-peak and quantity > 0).
- **FR-Inv-006** The system shall reserve inventory during checkout and release it on payment failure or cancellation.

## Acceptance Criteria
- **FR-Inv-001**
  - A batch record includes batch ID, roast date, and product ID.
  - Batch data is retrievable by product and batch ID.
- **FR-Inv-002**
  - Peak window start and end dates are computed from the configured window (default 7 and 21 days).
  - Batches outside the window are marked out-of-peak.
- **FR-Inv-003**
  - Inventory quantity decreases on order creation and increases on restock.
  - Reserved quantity is released when an order is canceled.
- **FR-Inv-004**
  - Low-stock alerts are generated when quantity falls below a configured threshold.
  - Alerts include product, batch, and remaining quantity.
- **FR-Inv-005**
  - Out-of-peak or out-of-stock batches do not appear as available in the storefront.
  - Out-of-peak batches remain visible to admins for management.
  - Visibility updates propagate within 5 minutes of inventory change.
- **FR-Inv-006**
  - Reserved quantity is created when checkout is initiated.
  - Reservations are released when payment fails or an order is canceled.
  - Reservations are converted to decremented on-hand quantity after successful payment.

## Non-Functional Requirements
- Performance: inventory queries respond within 200ms p95 for single product lookups.
- Availability: inventory endpoints meet 99.9% monthly uptime.
- Security: inventory updates require authenticated admin or service credentials.
- Reliability: inventory updates are idempotent and safe to retry; freshness window recalculation runs at least daily or on batch updates.
