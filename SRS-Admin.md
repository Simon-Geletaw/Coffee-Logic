# **Admin**

## Overview
The Admin subsystem allows staff to manage products, batches, inventory, orders, and alerts, ensuring operational control and accurate data across the platform.

## Functional Requirements
- **FR-Admin-001** The system shall allow admins to create, update, and archive products.
- **FR-Admin-002** The system shall allow admins to create and manage roast batches.
- **FR-Admin-003** The system shall allow admins to adjust inventory levels with audit logging.
- **FR-Admin-004** The system shall allow admins to view orders and subscription status.
- **FR-Admin-005** The system shall allow admins to configure low-stock thresholds and alert recipients.
- **FR-Admin-006** The system shall provide an audit log view for admin actions with filters by date and actor.
- **FR-Admin-007** The system shall allow role-based access control for admin features (viewer, operator, manager).

## Acceptance Criteria
- **FR-Admin-001**
  - Product changes are visible in the storefront within 5 minutes.
  - Archived products are not shown in the storefront.
- **FR-Admin-002**
  - A batch can be created with roast date, batch ID, and linked product.
  - Batch edits are tracked in audit logs.
- **FR-Admin-003**
  - Inventory adjustments require a reason and are recorded in audit logs.
  - Adjustments update available quantity within 5 minutes.
- **FR-Admin-004**
  - Admins can view order status, payment status, and fulfillment state.
  - Subscription status is visible per user and order.
- **FR-Admin-005**
  - Low-stock thresholds can be set per product or batch.
  - Alerts are sent to configured recipients when thresholds are crossed.
- **FR-Admin-006**
  - Admins can filter audit logs by date range and admin user.
  - Audit log entries include action, timestamp, and target entity.
- **FR-Admin-007**
  - Users with viewer role can read data but cannot change it.
  - Users with manager role can perform all admin actions.

## Non-Functional Requirements
- Performance: admin actions respond within 800ms p95.
- Availability: admin portal meets 99.5% monthly uptime.
- Security: admin access requires authenticated role-based access control.
- Compliance: all admin mutations are audit logged with user and timestamp.
