# Coffee Logic — 7-Day Production Shipping Plan (Supervisor Edition) - Part 2

> This continues your **technical supervisor and mentor** guide for Days 3 through 7.
> Remember: You are learning to think like a senior developer. Understand the *why* before you write the code.

---

## Day 3 (March 30): Inventory & Batch Service

**Theme**: Build the inventory domain — the business logic that makes Coffee Logic unique.

---

### Module 3A: Batch Module

#### The Tactical Task
Create `src/batch/` with module, service, controller, and DTOs. Admin-only CRUD: create a batch (roastDate, batchCode, productId), list batches by product.

#### The "Why"
The SRS requirement FR-Inv-001 says: "The system shall record batches with roast date, batch ID, and product association." Your Prisma schema already has the `Batch` model — but there's no service or controller to use it. The model is currently "dead data."

Batches are the **source of truth** for freshness. Without them, you can't compute peak flavor windows, track inventory per roast batch, or tell customers exactly when their coffee was roasted. This is your core domain logic, not just another CRUD entity.

#### Learning Path (UMC Method)

**USE — How to structure a NestJS domain module:**

Every domain in NestJS follows the same architectural pattern:

```text
src/batch/
├── batch.module.ts        ← wires everything together
├── batch.controller.ts    ← HTTP transport (routes, guards, decorators)
├── batch.service.ts       ← business logic (no HTTP concepts)
├── dto/
│   ├── create-batch.dto.ts    ← input validation
│   └── batch-response.dto.ts  ← output shaping (optional)
```

The key principle: **controllers know about HTTP, services know about business logic, neither knows about the other's concerns.** Your controller should never import Prisma types directly. Your service should ideally throw domain-specific errors (which map to HTTP constraints in the controller or a global filter).

**MODIFY — What you need to build:**

1. **`CreateBatchDto`** — Validate: `productId` (string, UUID), `batchCode` (string, non-empty), `roastDate` (ISO date string). Use `@IsUUID()` from class-validator for the product reference, and `@IsDateString()` for the roast date.

2. **`batch.service.ts`** — Methods:
   - `createBatch(dto)` — first verify the product exists (throw `NotFoundException` if not), then create the batch with Prisma.
   - `getBatchesByProduct(productId)` — return all batches for a product, ordered by roastDate descending.
   - `getBatchById(id)` — single batch lookup with inventory included (`include: { inventory: true }`).

3. **`batch.controller.ts`** — Routes (all protected by `JwtAuthGuard` and `RolesGuard`):
   - `POST /admin/batches` — create batch
   - `GET /admin/batches?productId=xxx` — list by product
   - `GET /admin/batches/:id` — single batch detail

4. **`batch.module.ts`** — Import nothing (PrismaModule is global), provide `BatchService`, declare `BatchController`.

5. **Register in `app.module.ts`** — Add `BatchModule` to imports.

**CREATE — Conceptual challenge:**

The `Batch` model has `expiresAt DateTime?` as optional in your schema. In a coffee freshness system, should expiration be calculated dynamically on-the-fly from `roastDate + peakWindowDays`, or should it be stored as a static value when the batch is created? 
*Hint: What happens when an admin changes the peak window configuration rule later — do all existing batches need updating in the database? Think about the tradeoffs between storage, computation, and data migration.*

#### Related Concepts to Learn Next
- **NestJS module encapsulation** — why a module should only export services that OTHER modules actually need, not everything.
- **Repository pattern** — adding a layer below services to abstract data access, so the service doesn't know about Prisma directly.
- **`class-transformer` serialization** — using `@Expose()` and `@Exclude()` to strictly control which fields appear in standard API JSON responses.

#### Git Commit
```text
feat(batch): add batch service with admin CRUD endpoints

- Uses pure NestJS module pattern
- Implements create/list/get batch logic for admin interface
- Validates Input with proper decorators
```

---

### Module 3B: Inventory Service & Peak Window

#### The Tactical Task
Create `src/inventory/` with the peak window computation, inventory state management (onHand, reserved, available), and reserve/release methods.

#### The "Why"
FR-Inv-002: "The system shall compute a configurable peak flavor window (default 7-21 days post-roast) and flag batches as in-peak or out-of-peak." This is the **core business logic of your entire platform** — it's what makes Coffee Logic different from a generic e-commerce store.

The peak window algorithm is pure business logic with no framework dependencies. This is where you practice **separating concerns**: the computation is a *pure function*, the service *orchestrates* it alongside data fetching, and the controller *exposes* it over HTTP.

#### Learning Path (UMC Method)

**USE — How to design business logic as pure functions:**

The peak window check should be a pure function:

```typescript
function isPeakFreshness(roastDate: Date, now: Date, windowStartDays: number, windowEndDays: number): boolean
```

It takes state inputs, returns a boolean, and has *no side effects*. This is trivially testable — you don't need to mock Prisma, you don't even need to start the NestJS app. You just assert inputs vs outputs.

Professionals separate this into:
1. **Pure function** — the algorithm itself (in a `utils/` file).
2. **Service method** — calls the pure function with data fetched from the DB.
3. **Controller route** — calls the service.

**MODIFY — What you need to build:**

1. **Create `apps/api/src/inventory/freshness.util.ts`** — The pure function:
   - Input: `roastDate`, `now` (default to `new Date()`), `windowStart` (default 7), `windowEnd` (default 21).
   - Logic: compute `peakStart = roastDate + windowStart days`, `peakEnd = roastDate + windowEnd days`.
   - Return: `{ isPeak: boolean, peakStart: Date, peakEnd: Date, daysPostRoast: number }`.

2. **Create `inventory.service.ts`** — Methods:
   - `getInventoryByBatch(batchId)` — returns inventory record with freshness evaluated.
   - `adjustInventory(batchId, adjustment, reason, actorId)` — admin adjusts stock manually.
   - `reserveInventory(batchId, quantity)` — atomic update: increases `reserved`, decreases `available`.
   - `releaseInventory(batchId, quantity)` — atomic update: decreases `reserved`, increases `available`.

3. **Create `inventory.controller.ts`** — Routes (admin):
   - `GET /admin/inventory/:batchId` — inventory detail with freshness data.
   - `PATCH /admin/inventory/:batchId/adjust` — manual adjustment (requires `reason` in body).

**CREATE — Conceptual challenge:**

Write the `isPeakFreshness` function logic on paper first. Consider: what does "day 7" mean? Is it exactly `7 * 24` hours from the `roastDate` timestamp, or is it 7 calendar days? What if the server runs in UTC time but the roaster operates in EST? Timezone handling is a real-world production trap — how would you safely compare midnight in different zones?

#### Related Concepts to Learn Next
- **Pure functions and referential transparency** — making your logic 100% predictable.
- **Inventory concurrency and Race Conditions** — what happens if two requests try to reserve the same 5 bags of coffee at the exact same millisecond? (Keywords: pessimistic locking, optimistic locking, Prisma concurrency).
- **Date arithmetic in JS** — using modern libraries like `date-fns` over native Dates to avoid pitfalls.

#### Git Commit
```text
feat(inventory): implement peak window computation and reservation logic

- Pure function isPeakFreshness for date calculations
- Inventory reserve/release with safeguards against negative availability
- Admin inventory manual adjustment implementation
```

---

## Day 4 (March 31): Public Storefront & Audit Logging

**Theme**: Separation of concerns between public APIs and private administration, and building the audit trail.

---

### Module 4A: Public Storefront Endpoints

#### The Tactical Task
Create `src/storefront/` with public (no-auth) endpoints: a product listing endpoint with freshness-filtered results, and a product detail endpoint that returns sensory profiles.

#### The "Why"
ALL your current product routes are locked under `/admin/products` and require an admin JWT. That means a customer actually *can't* browse to buy anything. FR-SF-001 through FR-SF-003 require public browsing.

Architectural principle: **Public routes and administrative routes belong in separate controllers.** They may utilize the same underlying data, but their filtering logic, exposure of fields, and purpose are entirely different.

#### Learning Path (UMC Method)

**USE — How separation of public/private APIs works:**

In an enterprise app, you don't just "turn off the guard" on certain endpoints based on an `if` statement. You physically separate them:
- `AdminProductsController` - Can see `isActive: false` products. Can see all prices, margins, internal notes.
- `StorefrontProductsController` - Hardcoded to only ever return `isActive: true` products that have available, in-peak stock.

**MODIFY — What you need to build:**

1. **Create `src/storefront/storefront.module.ts` and `storefront.controller.ts`**:
   - `GET /storefront/products` — no authentication. Returns only active products with available, in-peak batches.
   - `GET /storefront/products/:id` — returns product details with sensory profile.

2. **Create `storefront.service.ts`** (or use public methods in `ProductService`):
   - Fetching logic shouldn't just fetch all products. It needs to join the `Batch` and `Inventory` tables to ensure only products meeting freshness requirements are served.

3. **Response Shaping**: Use a new mapped DTO (`PublicProductDto`) to strip away DB-internal fields (like `id`, `createdAt`, `updatedAt`) or sensitive admin fields before passing the object out to the internet.

**CREATE — Conceptual challenge:**

If checking if a product is "in-peak" relies on the `now()` date when the request is made dynamically, how would you aggressively cache the `GET /storefront/products` response? Caching dynamic date-dependent data is tricky. Think about cache invalidation strategies (e.g. invalidating the cache at midnight UTC every day).

#### Git Commit
```text
feat(storefront): add public product API endpoints

- Separate public controllers from admin controllers
- Filters out inactive, out-of-stock, and out-of-peak items by default
- Excludes sensitive DB fields from the response payload
```

---

### Module 4B: Audit Logging Service

#### The Tactical Task
Create `src/audit/` with a service that logs administrative mutations to your `AuditEvent` table. Integrate this logging into product, batch, inventory, and user services.

#### The "Why"
FR-Admin-006: "The system shall provide an audit log view for admin actions with filters by date and actor."

Audit logging is known as a **cross-cutting concern**. It touches many services but isn't the core logic of any single one of them. The professional approach is to create a lightweight, globally available audit service and inject it where mutations successfully happen.

#### Learning Path (UMC Method)

**USE — How to cleanly log without bloating code:**

Instead of putting Prisma `.create()` statements for audit logs in 50 different places, abstract it.

```typescript
// Good abstraction
await this.auditService.log(userId, 'PRODUCT_UPDATED', 'Product', productId, { previousPrice, newPrice });
```

**MODIFY — What you need to build:**

1. **`audit.service.ts`**: Single method `log(actorUserId, action, targetType, targetId, metadata?)`.

2. **The "Who" Problem**: Inside a Service, you don't inherently have access to the `Request` object to know who the JWT belongs to. You must pass `req.user.id` from the Controller down into your Service methods. Update signatures: `createProduct(dto: CreateProductDto, actorId: string)`.

3. **Integration**: Call `auditService.log()` inside the success paths of `createProduct`, `updateProduct`, `deleteProduct`, and `adjustInventory`.

4. **Query Endpoint**: `GET /admin/audit?from=&to=&actorId=` to retrieve the logs via an `AuditController`.

**CREATE — Conceptual challenge:**

An advanced alternative to manually calling the audit service inside every method is using a **NestJS Interceptor**. An interceptor can catch every `POST`, `PATCH`, and `DELETE` request, extract the user from the Request, wait for the route to succeed, and then log it automatically. What are the tradeoffs? (Hint: Does the Interceptor know the exact business reason for the change, or just the HTTP payload?)

#### Git Commit
```text
feat(audit): implement admin action audit logging

- New AuditService abstraction for standardized event logging
- Passes actorId down from controllers to mutative service methods
- Adds GET /admin/audit endpoint with filtering
```

---

## Day 5 (April 1): Frontend Resilience & Checkout Foundation

**Theme**: Error boundaries, loading states, and laying the groundwork for payment flows.

---

### Module 5A: Frontend Hardening

#### The Tactical Task
Add skeleton loaders for the product table in Next.js, fix the `AuthGuard` role logic to support multiple roles, and implement component-level error boundaries.

#### The "Why"
Right now, your admin dashboard is blank while data is fetching from the API. Users think the page is frozen. Skeleton loaders are the industry standard for communicating "data is coming."
Furthermore, if one component throws an error, it crashes the whole React tree because you lack granular Error Boundaries.

#### Learning Path (UMC Method)

**MODIFY:**

1. **Skeleton Loaders** — Create a `<ProductTableSkeleton />` component. This should render an HTML table but the cells contain div blocks with a CSS animation (e.g. `animate-pulse` in Tailwind). Display this conditionally if the React Query `isPending`.
2. **Fix `AuthGuard`** — The expression `session.user.role === role` means a `manager` cannot access admin pages. Change the `role` prop to accept an array of allowed roles, and check `allowedRoles.includes(session.user.role)`.
3. **React Error Boundary** — Create a class-based `ErrorBoundary` component. Wrap individual sections of the dashboard. If the Products table fails, the API Health stats should stay visible.

**CREATE — Conceptual challenge:**

Why MUST React Error Boundaries be written as Class Components (`componentDidCatch`, `getDerivedStateFromError`) while the rest of modern React uses Function Components and Hooks? Dig into the React lifecycle mechanics to understand why a hook equivalent doesn't exist yet.

#### Git Commit
```text
feat(web): add skeleton loaders, component error boundaries, and fix AuthGuard

- Improved UX drastically during high-latency network calls
- Prevents full-page crashes using scoped boundaries
- AuthGuard now supports RBAC hierarchy arrays
```

---

### Module 5B: Checkout Module (Backend Foundation)

#### The Tactical Task
Create `src/checkout/` to handle Stripe checkout session creation, webhook reception with cryptographic signature verification, and idempotency.

#### The "Why"
You must handle payments reliably. The golden rule of Stripe integration: **Never create the confirmed Order when the user clicks 'Pay'. Only create the Order asynchronously when Stripe's server sends a webhook to your server confirming payment capture.**

#### Learning Path (UMC Method)

**USE — The Stripe Checkout Architecture:**

1. User clicks Buy.
2. NestJS creates a Stripe Checkout Session via API.
3. NestJS returns a Session URL. Frontend redirects user to Stripe.
4. User pays on Stripe's hosted form.
5. Stripe sends a POST webhook (`checkout.session.completed`) to NestJS.
6. NestJS verifies webhook signature, checks if the order exists, reserves inventory, and creates the order.

**MODIFY — What you need to build:**

1. **Install Stripe SDK**: `pnpm add stripe` in `apps/api`.
2. **Initialize Stripe Service**: Pass the `STRIPE_SECRET_KEY` from your `ConfigService`.
3. **Webhook Endpoint**: Create `POST /checkout/webhook`. You MUST use `express.raw({type: 'application/json'})` for this endpoint because Stripe expects you to verify the signature against the actual raw byte string, not an object parsed by body-parser.
4. **Signature Verification**: `stripe.webhooks.constructEvent(payload, signature, secret)`. If this fails, throw a 400.
5. **Idempotency Check**: Query your database for `paymentIntentId`. If it's already processed, return 200 immediately (do nothing).

**CREATE — Conceptual challenge:**

Stripe guarantees "at-least-once" delivery of webhooks. It might send the EXACT same success webhook twice. If you don't handle this flawlessly, you will deduct inventory twice or create two orders for the user. How do you implement robust Idempotency Keys in a high-concurrency Node.js environment?

#### Git Commit
```text
feat(checkout): implement Stripe checkout sessions and secure webhook reception

- Adds raw body parsing for Stripe cryptographic validation
- Creates Stripe webhook receiver with basic idempotent guards
```

---

## Day 6 (April 2): Testing, Security Scan & Tooling

**Theme**: Prove it works. Lock it down. Automate quality.

---

### Module 6A: Auth Matrix E2E Tests

#### The Tactical Task
Write E2E tests using `@nestjs/testing` and `supertest` that verify your complete authentication and authorization matrix.

#### The "Why"
You've built JWTs, Role Guards, inactive user checks. If you accidentally comment out one `@UseGuards` line in the future, the security of the application vanishes. Without automated tests, you won't know until you're hacked.

#### Learning Path (UMC Method)

**USE — How NestJS E2E testing works:**

```typescript
// E2E spins up your entire app in memory
const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
const app = module.createNestApplication();
await app.init();

// Use supertest to make real HTTP calls against the in-memory app
await request(app.getHttpServer()).get('/admin/products/list').expect(401);
```

**MODIFY — Tests to write in `test/app.e2e-spec.ts`:**
1. No token → `GET /admin/products/list` → expected `401 Unauthorized`
2. Junk token → expected `401 Unauthorized`
3. Valid User (non-admin) token trying to access Admin route → expected `403 Forbidden`
4. Valid Admin token → expected `200 OK`
5. Known deactivated admin → expected `401 Unauthorized`

#### Git Commit
```text
test(auth): implement full E2E matrix testing for RBAC security
```

---

### Module 6B: Security Headers & CI/CD Tooling

#### Tactical Tasks
- Add Helmet middleware for HTTP security headers.
- Configure strict CORS.
- Set up a GitHub Actions CI pipeline (`.github/workflows/ci.yml`).

#### The "Why"
Security is posture, not just code. Headers like `Strict-Transport-Security`, `X-Content-Type-Options` and stripping `X-Powered-By` are trivial configuration changes that prevent common attack vectors.
CI (Continuous Integration) is your robotic quality gate. It ensures that no code is merged to main unless it passes linting and unit tests.

#### Git Commits
```text
chore(ci): add GitHub Actions pipeline for linting, testing, and building
feat(security): configure helmet and strict CORS environments
```

---

## Day 7 (April 3): Ship Day 🚀

**Theme**: Deployment, verification in production, and documentation runbooks.

### Module 7A: Deployment Operations
- Deploy your Postgres database into production (managed DB).
- Deploy the NestJS API application (e.g. Railway, Render or defined provider).
- Add real production environment variables via the host dashboard.
- Run Prisma migrations against the production DB: `npx prisma migrate deploy`.
- Deploy the Next.js Frontend (Vercel).

### Module 7B: Post-Deploy Smoke Tests
- Login to the production admin app with created admin credentials.
- Create a real product.
- Hit the public `/storefront/products` API from a terminal (`curl`) and ensure CORS behaves.
- Ensure standard logs are emitted correctly and not flooded with debug info.

### Module 7C: Documentation
- Update `README.md` with explicit local deployment and build instructions.
- Create `docs/RUNBOOK.md` detailing how to rollback migrations and where to check Server logs.
- Archive or securely delete leftover `.tmp-*` files from your development iterations.

#### Git Commit
```text
chore(release): prep for v1.0.0 ship to production environments
```

---

## User Review Required

> [!CAUTION]
> **Prioritization Decision**: You stated we have 7 days. Subscriptions (FR-Subs-*) involve complex logic around the Stripe Billing lifecycle (creating recurring objects, pausing, cancelling, sending emails out). I have placed Checkout foundation on Day 5 and deferred full Subscriptions. **Do you want to swap the priority? Should we build Subscriptions on Day 5 instead?**

---
(Note: Be sure to read the "Senior Dev Toolkit" artifact provided previously to dive deep into debugging and mindset. Reply with your answers to the open questions to proceed with modifying the actual files for Day 1!)
