# Inventory Management

## Overview

Inventory Management tracks stock levels for each roasting batch. Every batch (a single roast run) can have one inventory record that tracks how much stock is on hand, how much is reserved for orders, and how much is available.

## Data Model

```prisma
model Batch {
  id        String    @id @default(uuid())
  productId String
  batchCode String
  roastDate DateTime
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  isActive  Boolean   @default(true)    // Soft-delete flag

  product   Product    @relation(fields: [productId], references: [id])
  inventory Inventory?
}

model Inventory {
  id        String   @id @default(uuid())
  batchId   String   @unique             // One inventory per batch
  onHand    Int                           // Physical stock
  reserved  Int                           // Committed to orders
  available Int                           // Calculated: onHand - reserved
  updatedAt DateTime @updatedAt
  status    Boolean  @default(true)       // Soft-delete flag

  batch Batch @relation(fields: [batchId], references: [id])
}
```

### Key Design Decisions

- **`batchId` is unique** — one inventory record per batch. Prevents duplicate tracking.
- **`available` is denormalized** — stored in DB for fast queries, always recalculated server-side.
- **Soft-delete** — both `Batch.isActive` and `Inventory.status` use boolean flags instead of hard deletes.

## Business Rules

1. `available` is always calculated as `onHand - reserved` — never set directly by clients.
2. `onHand` must never be less than `reserved` (prevents negative available).
3. `reserved` can never exceed `onHand`.
4. Soft-deleting a batch cascades to its inventory record.

## API Routes

All routes require `JwtAuthGuard + RolesGuard('admin')`.

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/admin/inventory` | List all inventory with batch + product | — |
| `GET` | `/admin/inventory/batch/:batchId` | Get inventory by batch ID | — |
| `POST` | `/admin/inventory` | Create inventory for a batch | `{ batchId: UUID, onHand: number }` |
| `PATCH` | `/admin/inventory/:id` | Adjust stock quantities | `{ onHand?: number, reserved?: number }` |
| `DELETE` | `/admin/inventory/:id` | Soft-delete (sets status=false) | — |

### Error Responses

| Status | Condition |
|---|---|
| `400` | `onHand < reserved` after adjustment |
| `404` | Batch or inventory not found |
| `409` | Inventory already exists for this batch |
| `401` | Missing or invalid JWT |
| `403` | User role is not admin |

## Frontend Component Tree

```
app/(admin)/inventory/page.tsx
  └─ AuthGuard
      └─ AdminShell
          └─ ErrorBoundary
              └─ InventoryDashboard
                    ├─ InventoryAdjustPanel (inline, when editing)
                    ├─ InventoryAddForm (collapsible)
                    │     └─ Batch dropdown (filters out batches with inventory)
                    └─ InventoryTable
                          └─ Stock health badges
                                ├─ badge-success (available > 20)
                                ├─ badge-warning (available 1-20)
                                └─ badge-danger  (available 0)
```

### Key Frontend Patterns

- **Batch dropdown in add form**: fetches both `batches` and `inventory` queries, computes `batchesWithoutInventory` via `useMemo` by filtering out batchIds that already exist in the inventory list.
- **Inline adjust panel**: shows current values, lets user change onHand/reserved, shows live calculated `available` with color badge, disables save if available would go negative.
- **Stock health badges**: visual indicators using the existing CSS badge system (`badge-success`, `badge-warning`, `badge-danger`).

## File Map

### Backend

| File | Purpose |
|---|---|
| `apps/api/src/inventory/dto/create-inventory.dto.ts` | Validation rules for creating inventory |
| `apps/api/src/inventory/dto/update-inventory.dto.ts` | Validation rules for adjusting stock (all optional) |
| `apps/api/src/inventory/inventory.service.ts` | Business logic + Prisma $transaction for atomic adjustments |
| `apps/api/src/inventory/inventory.controller.ts` | REST endpoints with guard composition |
| `apps/api/src/inventory/inventory.module.ts` | Module wiring |
| `apps/api/src/batches/batches.service.ts` | Modified: soft-delete cascades to inventory |

### Frontend

| File | Purpose |
|---|---|
| `apps/web/src/lib/types.ts` | `Inventory`, `InventoryPayload`, `InventoryAdjustPayload` types |
| `apps/web/src/lib/api.ts` | `getInventory`, `createInventory`, `adjustInventory`, `deleteInventory` |
| `apps/web/src/hooks/use-inventory.ts` | 4 React Query hooks (query + 3 mutations) |
| `apps/web/src/components/inventory/inventory-table.tsx` | Table with stock health badges |
| `apps/web/src/components/inventory/inventory-dashboard.tsx` | Dashboard + add form + adjust panel |
| `apps/web/src/app/(admin)/inventory/page.tsx` | Route page |

## Testing Plan

### Backend

```bash
# 1. Create inventory for a batch
curl -X POST http://localhost:3001/admin/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<uuid>","onHand":100}'
# → 201 { onHand: 100, reserved: 0, available: 100 }

# 2. Duplicate batchId
curl ... # same payload
# → 409 "Inventory already exists for this batch"

# 3. List all
curl http://localhost:3001/admin/inventory -H "Authorization: Bearer $TOKEN"
# → 200 [{ ... includes batch.product.name }]

# 4. Adjust stock
curl -X PATCH http://localhost:3001/admin/inventory/:id \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"onHand":150,"reserved":10}'
# → 200 { onHand: 150, reserved: 10, available: 140 }

# 5. Invalid: reserved > onHand
curl -X PATCH ... -d '{"onHand":5,"reserved":10}'
# → 400 "Cannot reserve 10 when only 5 are on hand"
```

### Frontend

1. Login as admin → verify "Inventory" appears in sidebar
2. Click "Inventory" → empty state shows "No inventory records found"
3. Click "Add Inventory" → batch dropdown shows only batches without inventory
4. Select batch, enter quantity → submit → row appears in table
5. Click edit icon on a row → adjust panel opens with current values
6. Change quantities → save → row updates
7. Verify badge colors change based on available count
8. Click delete → two-step confirmation → row disappears

## Database Migration

The migration `20260702205329_add_is_active_to_batch` adds `isActive Boolean @default(true)` to the Batch model. Existing rows default to `true`.
