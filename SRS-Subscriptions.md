# **Subscriptions**

## Overview
Subscriptions allow customers to schedule recurring deliveries with selectable cadence, while still supporting one-time purchases. The goal is convenience for customers and predictable recurring revenue for the business.

## Functional Requirements
- **FR-Subs-001** The system shall provide a product page toggle between one-time purchase and subscription.
- **FR-Subs-002** If subscription is selected, the system shall require a delivery cadence (e.g., every 7 days, every 14 days, or monthly).
- **FR-Subs-003** The system shall allow authenticated users to pause, resume, or cancel subscriptions through a secure My Account portal.

- **FR-Subs-004** The system shall email customers a reminder before each subscription charge (e.g., 3 days prior).

## Acceptance Criteria
- **FR-Subs-001**

  - Toggle between one-time purchase and subscription is visible on product pages.
  - Selected purchase mode persists into cart and checkout.
  - Switching modes updates price and checkout intent accordingly.
- **FR-Subs-002**
  - Subscription cadence selection is required before checkout.
  - Allowed cadences are limited to 7 days, 14 days, and monthly.
  - Selected cadence is stored with the subscription record.
- **FR-Subs-003**
  - Authenticated users can pause, resume, and cancel from My Account.
  - Changes are reflected in the subscription status within 1 minute.
  - The system prevents billing while a subscription is paused.
- **FR-Subs-004**
  - Reminder email is sent 3 days before each subscription charge.
  - Email includes product name, cadence, and next charge date.
  - Failed email delivery is logged for retry.

## Non-Functional Requirements
- Performance: subscription management actions respond within 500ms p95 (excluding Stripe latency).
- Availability: subscription management endpoints meet 99.9% monthly uptime.
- Security: subscription actions require authenticated sessions; webhook events are signature-validated.
- Reliability: webhook processing is idempotent and safe to retry.
