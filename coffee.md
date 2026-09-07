# Coffee Logic — Session Save (July 2, 2026)

## Current State

**Branch:** `feature/storefront` (created from `develop`)
**Latest develop commit:** `1c6a63a` — docs: add inventory-management.md documentation
**No commits yet on feature/storefront** — clean branch, ready to start fresh.

## What Was Built Today (Inventory Management)

Full-stack Inventory Management, merged into `develop`:

### Backend
- `apps/api/src/inventory/dto/create-inventory.dto.ts` — validation for batchId (UUID) + onHand (Int >= 0)
- `apps/api/src/inventory/dto/update-inventory.dto.ts` — all-optional PATCH for onHand/reserved
- `apps/api/src/inventory/inventory.service.ts` — CRUD with Prisma $transaction for atomic stock adjustments, business rule: onHand >= reserved
- `apps/api/src/inventory/inventory.controller.ts` — 5 routes: GET all, GET by batch, POST, PATCH, DELETE
- `apps/api/src/inventory/inventory.module.ts` — wiring
- Retrofit: `batches/batches.service.ts` — findAll filters `isActive: true`, remove uses $transaction to cascade soft-delete batch + inventory

### Frontend
- `apps/web/src/lib/types.ts` — added Inventory, InventoryPayload, InventoryAdjustPayload
- `apps/web/src/lib/api.ts` — getInventory, createInventory, adjustInventory, deleteInventory
- `apps/web/src/hooks/use-inventory.ts` — 4 React Query hooks
- `apps/web/src/components/inventory/inventory-table.tsx` — table with stock health badges (green >20, yellow 1-20, red 0)
- `apps/web/src/components/inventory/inventory-dashboard.tsx` — add form with batch dropdown (filters batches without inventory), inline adjust panel with live calculated available
- `apps/web/src/app/(admin)/inventory/page.tsx` — route page
- `apps/web/src/components/admin-shell.tsx` — added Inventory nav link with Warehouse icon

### Database
- Migration `20260702205329_add_is_active_to_batch` — added `isActive Boolean @default(true)` to Batch model

### Docs
- `docs/11-inventory-management.md` — data model, business rules, API routes, component tree, file map, testing plan

---

## What's Planned For Tomorrow (July 3) — Storefront/Public Catalog

### Goal
Build a **public-facing product catalog** with SSR product listing, attribute filters, and product detail pages. No login required.

### Prisma models (already exist, no migration needed)
```
Product { id, name, description?, roastLevel, grind, origin, process, caffeine, sensoryProfile? (JSON), isActive, variants[] }
ProductVariant { id, productId, weightGrams, priceCents, sku, isActive }
```

### Route structure
```
(storefront)/               ← new public route group
  page.tsx                  ← Product listing with SSR + filters
  products/
    [id]/page.tsx           ← Product detail page with SSR
```

### 15-Agent Plan

#### Wave 0: Design (START HERE)
- Agent 01: UI Design Research — research coffee roastery storefronts, define design language, color palette, typography, component specs, ASCII wireframes

#### Wave 1: Backend (parallel)
- Agent 02: StorefrontController — GET /products (list with filters, no auth), GET /products/:id (detail with variants + sensoryProfile)
- Agent 03: ProductService enhancement — add getProductById() method with include variants
- Agent 04: StorefrontModule — create module file, register in AppModule

#### Wave 2: Frontend Foundation (parallel)
- Agent 05: Public API client — getPublicProducts(), getPublicProduct(id), extend types with ProductDetail
- Agent 06: Public Layout — (storefront)/layout.tsx with header + footer
- Agent 07: Storefront CSS additions — new CSS variables, utility classes if needed

#### Wave 3: Components (parallel)
- Agent 08: ProductCard — server component with coffee-themed badges
- Agent 09: FilterBar — client component with dropdowns, URL search params
- Agent 10: SensoryProfileTable — render JSON sensory data beautifully
- Agent 11: Skeleton/Empty/Error states — loading, empty, error for storefront

#### Wave 4: Pages (parallel)
- Agent 12: Listing Page — SSR with searchParams filters + product grid
- Agent 13: Detail Page — SSR [id] dynamic route

#### Wave 5: Integration (sequential)
- Agent 14: Navigation & Routing — root page redirect (storefront or admin toggle), breadcrumbs, nav links
- Agent 15: Polish & Docs — responsive breakpoints, WCAG, write docs/12-storefront.md

### Commit Milestones
```
feature/storefront
  ├─ 📦 Commit 1: "feat(api): add public storefront endpoints"
  ├─ 📦 Commit 2: "feat(web): add storefront layout and API client"
  ├─ 📦 Commit 3: "feat(web): add product listing page with SSR filters"
  ├─ 📦 Commit 4: "feat(web): add product detail page with SSR"
  ├─ 📦 Commit 5: "feat(web): add navigation, responsive, and edge cases"
  ├─ 🔀 Merge into develop
  └─ 📄 Write docs
```

### Key Design Assets Already In Codebase
- Color palette: `--accent: #7a3e19` (warm brown), `--bg: #f4f1e8` (cream), `--text: #1f1a14` (dark)
- Fonts: Space Grotesk (headings), IBM Plex Mono (mono)
- Tailwind CSS v4 configured
- Existing globals.css with coffee theme

### What To Review Before Starting
1. Read `coffee.md` (this file) for full context
2. Read `globals.css` lines 1-60 for current CSS variables
3. Read `prisma/schema.prisma` for Product + ProductVariant models
4. Read `apps/api/src/product/product.service.ts` for existing product queries
5. Start with Wave 0: UI Design Research agent
