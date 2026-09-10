# Orders Module — 3-Hour Build & Learn Plan

**Goal:** Build a working `Orders` backend module for Coffee Logic. Customers/admins can place an order; the server computes the real price, reserves inventory, and stores it all atomically.

**You will learn 3 things (for real, not just copy-paste):**
1. **Prisma `$transaction`** — do many writes all-or-nothing.
2. **Never trust the client for money** — server computes prices from the DB.
3. **Prisma nested writes + relational reads** — create an Order *with* its items, read it back *with* product info joined.

**Rhythm (our usual):** concept → syntax → implement → verify → commit → say-it-like-a-pro.

---

## Why this build (the gap we're filling)

You already have: `auth`, `user`, `products`, `batches`, `inventory`.
Your schema has `Order`, `OrderItem`, `Subscription`, `AuditEvent`, `WebhookLog` — **but no backend for any of them.**

The single most important missing piece is **Orders**: nothing currently turns "I want 2 bags of variant X" into a stored order. It ties together Product → Variant → Inventory. Perfect learning target.

**The data flow we're building:**
```
Client sends:   [{ productVariantId, quantity }, ...]   ← NO prices! never trust client for money
Server does:    look up each variant's real priceCents in DB
                compute lineTotal = price × qty, orderTotal = sum
                reserve inventory for each variant's batch
                create Order + OrderItems
                ── all inside ONE transaction ──
Server returns: the full order with items + product names
```

---

## Pre-flight checklist (5 min) — do this first

Open a terminal at `D:\Coffe Logic`.

- [ ] **1. Start the database:**
      ```
      docker compose up -d
      ```
      (Postgres on port 7000, Redis on 6379.)

- [ ] **2. Make sure the API runs right now (baseline):**
      ```
      pnpm dev:api
      ```
      You should see Nest boot on `http://localhost:3001`. If it errors, STOP and tell me — we fix that before building. Then Ctrl-C.

- [ ] **3. Create a branch (never build on main):**
      ```
      git checkout -b feat/orders-module
      ```

- [ ] **4. Confirm you have a JWT to test with.** We'll need to log in as `admin` later to call protected routes. If you're not sure you have an admin user seeded, tell me and we'll handle it in Hour 1.

> ✅ Checkpoint: DB up, API boots clean, on a fresh branch. **Message me "pre-flight done" and we begin.**

---

## HOUR 1 — Scaffolding + the DTOs + "never trust the client"

**Concept first (I'll explain live, this is the summary):**
A *DTO* (Data Transfer Object) is the shape of what the client is *allowed* to send. Because your `main.ts` has `ValidationPipe({ whitelist: true })`, any field the client sends that is NOT in the DTO is **silently stripped**. That's your first line of defense: even if a hacker adds `"priceCents": 1`, it never reaches your code.

### Files we'll create (matches your existing module pattern exactly)
```
apps/api/src/orders/
  dto/create-order.dto.ts
  orders.service.ts
  orders.controller.ts
  orders.module.ts
```

### Step 1.1 — The DTO (client input shape)
`create-order.dto.ts` will define:
- `items`: an array of `{ productVariantId: string (uuid), quantity: int ≥ 1 }`
- optional `userId` (who's ordering — nullable in your schema)
- **Notice what's NOT here:** no price, no total. The client *cannot* send money. ← concept #2 in action.

We use `class-validator` decorators (`@IsArray`, `@ValidateNested`, `@IsUUID`, `@IsInt`, `@Min`) — same library your `create-product.dto.ts` already uses.

### Step 1.2 — Empty service + controller + module
Wire up the skeleton (like `inventory.module.ts`), register `OrdersModule` in `app.module.ts`.

### Verify
- API still boots (`pnpm dev:api`) with the new empty module. No red.

### Commit
```
git add apps/api/src/orders
git commit -m "feat(orders): scaffold orders module + create-order DTO"
```

> 🎓 **Say it like a pro:** "I defined the request contract with a DTO and let the global ValidationPipe whitelist it, so the client can't inject fields like price — the server is the single source of truth for money."

---

## HOUR 2 — The core: create an order inside a `$transaction`

This is the heart. Take your time here.

**Concept first — why a transaction?**
Placing an order is several writes:
1. create the `Order` row
2. create N `OrderItem` rows
3. update `Inventory.reserved` for each variant's batch

If step 3 fails (not enough stock) *after* step 1 succeeded, you'd have a phantom order with no stock reserved → corrupt data. A **transaction** means: **all succeed, or none do.** Prisma gives you `this.prisma.$transaction(async (tx) => { ... })`. Inside, you use `tx` instead of `this.prisma`. If anything throws, everything rolls back automatically.

You already saw this pattern in `inventory.service.ts` `adjustStock()` — we go further.

### Step 2.1 — `createOrder(dto)` logic, in order:
1. Guard: `items` non-empty (else `BadRequestException`).
2. Collect the variant IDs. Fetch them from DB in one query (`findMany({ where: { id: { in: ids } } })`) — including `priceCents`, `isActive`, and their `batch → inventory` so we know available stock.
3. Validate: every requested variant exists, is active. (404/400 if not.)
4. **Compute money from the DB, not the client:**
   - `lineTotalCents = variant.priceCents × quantity`
   - `totalCents = Σ lineTotalCents`
5. Open `$transaction`:
   - For each item: check `inventory.available ≥ quantity`; if not, throw (rolls back everything).
   - Reserve: `reserved += quantity`, `available = onHand − reserved`.
   - Create the `Order` with **nested** `items: { create: [...] }` — one Prisma call writes the order AND all its OrderItems. ← concept #3.
6. Return the created order including items + product info.

**I will write this WITH you, explaining each block. You'll type the key parts.**

### Verify (this is the fun part)
Boot the API, get an admin JWT, then:
```
# 1. log in to get a token
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d "{\"email\":\"...\",\"password\":\"...\"}"

# 2. place an order (use a real productVariantId from your DB)
curl -X POST http://localhost:3001/admin/orders -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"items\":[{\"productVariantId\":\"<UUID>\",\"quantity\":2}]}"
```
Expected: a JSON order with a correct `totalCents` **that you never sent**. Then check inventory — `reserved` went up by 2. That's the whole lesson made visible.

**Also test the failure path:** order more than `available`. You should get a clean error AND inventory should be unchanged (transaction rolled back). Prove it by re-checking inventory.

### Commit
```
git commit -am "feat(orders): create order with server-side pricing + inventory reservation in a transaction"
```

> 🎓 **Say it like a pro:** "Order creation is atomic — I reserve stock and write the order and its items in one `$transaction`, so a stock shortfall rolls the whole thing back. Totals are computed server-side from `priceCents`, never accepted from the client."

---

## HOUR 3 — Read endpoints + polish + final commit

Now the easy, satisfying part — reading data back with relations.

### Step 3.1 — `GET /admin/orders` (list)
`findMany` with `include` items → productVariant → product (name). `orderBy: createdAt desc`. Optional `?status=` filter (same pattern as your products filter).

### Step 3.2 — `GET /admin/orders/:id` (one order)
`findUnique`, include the same relations, 404 if missing (your standard `NotFoundException`).

### Step 3.3 — Guards + polish
- Add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` to the controller (copy from `inventory.controller.ts`).
- Confirm cents→money is documented (we store cents, format on frontend).

### Verify
- `GET /admin/orders` returns your test order with product names joined in.
- `GET /admin/orders/<id>` returns the one; a random UUID returns 404.

### Final commit + push
```
git commit -am "feat(orders): list + get-by-id with relational includes and admin guards"
git push -u origin feat/orders-module
```

> 🎓 **Say it like a pro:** "Reads use Prisma `include` to join OrderItems and their product in a single query, so the API returns a fully-hydrated order without N+1 round-trips."

---

## End state — what you'll have built

| Endpoint | Method | Does |
|---|---|---|
| `/admin/orders` | POST | Place an order — server prices it, reserves stock, atomic |
| `/admin/orders` | GET | List orders (+ optional `?status=`) |
| `/admin/orders/:id` | GET | One order, fully joined |

And you'll be able to *explain* transactions, server-side pricing, and Prisma relations — the 3 things.

## If we finish early (stretch goals, pick one)
- Write one unit test for `createOrder` totals (you have `*.spec.ts` examples).
- Add `AuditEvent` write when an order is created (uses a model with no backend yet).
- Add `cancelOrder` that releases reserved stock (teaches the transaction in reverse).

## If we run short on time
Hour 2's `createOrder` is the prize. If Hour 3 gets squeezed, we ship POST + list only and note GET-by-id as the next task. **A working, committed POST /orders beats three half-finished endpoints.**

---

### Ground rules for the session
- We commit at the end of every hour — always leave it green.
- You type the important lines; I explain, you implement, we verify together.
- If the API goes red, we stop and fix before moving on. No building on broken.
