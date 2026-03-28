# Coffee Logic: The Plan

> **One document. Read each phase. Build it. Test it. Commit it. Move to the next phase.**
> By Phase 7 you will have shipped a production app and mastered NestJS.

---

# Foundations (Read Before Phase 1)

## Your Background Mapped to This Stack

| Java / Spring | Django | NestJS | Purpose |
|---|---|---|---|
| `@RestController` | `views.py` | `@Controller()` | Route HTTP requests |
| `@Service` | Service layer | `@Injectable()` | Business logic |
| `@Autowired` | — | Constructor injection | Dependency Injection |
| `@Valid` + DTO | Forms / Serializers | `ValidationPipe` + DTO | Input validation |
| `@ControllerAdvice` | Custom error handler | `Exception Filters` | Central error handling |
| Spring Security Filters | `@login_required` | `Guards` | Authorization |
| `application.yml` | `settings.py` | `@nestjs/config` | Environment config |
| Hibernate / JPA | Django ORM | Prisma | Database access |
| Maven/Gradle | pip | pnpm | Package management |

## TypeScript vs Java: The Critical Differences

**Types vanish at runtime.** In Java, `instanceof User` works because the class exists at runtime.
In TypeScript, interfaces are completely erased after compilation. This means:
- TypeScript catches dev mistakes at compile time ✅
- TypeScript does NOT protect against bad API input at runtime ❌
- That's why we use `class-validator` (for HTTP bodies) and `Zod` (for env vars and frontend forms)

```typescript
// Three layers of safety — you need ALL THREE:
// 1. TypeScript (compile-time): catches YOUR mistakes while coding
interface User { email: string; role: 'admin' | 'viewer'; }

// 2. class-validator (runtime): catches BAD INPUT from HTTP requests
class CreateUserDto { @IsEmail() email: string; }

// 3. Zod (runtime): catches BAD CONFIG from environment
const envSchema = z.object({ JWT_SECRET: z.string().min(32) });
```

**Structural typing (duck typing):** If it has the right shape, TypeScript accepts it.
```typescript
interface HasEmail { email: string; }
const obj = { email: 'a@b.com', name: 'Alice' }; // extra 'name' field
const valid: HasEmail = obj; // ✅ TypeScript accepts — it has 'email'
```

**Key types to know:** `Union` (`'a' | 'b'`), `Partial<T>` (all optional), `Omit<T, 'field'>`, `Pick<T, 'field'>`, `Promise<T>` (async return), Generics (`<T>`).

## Node.js: One Thread, Not Many

**Java:** Each request = its own thread. 100 users = 100 threads.
**Node.js:** ALL requests share ONE thread via an Event Loop.
- When code hits `await prisma.query()`, Node **pauses** that function and serves others.
- **NEVER** run CPU-heavy loops in a controller — it blocks ALL users.
- Use `async/await` for every I/O operation (DB, HTTP calls, file reads).

## The NestJS Request Pipeline (MEMORIZE)
```
Request → Middleware → Guards → Interceptors(before) → Pipes → Controller → Service → Interceptors(after) → Exception Filter → Response
```
- 401? → **Guard** rejected you (bad/missing JWT)
- 400? → **Pipe** rejected you (DTO validation failed)
- 500? → **Service** threw, check **Exception Filter** logs

## Git Flow for This Project

Every phase below follows this exact flow:
```bash
git checkout main && git pull
git checkout -b type/short-name     # create branch
# ... code + test ...
git add . && git diff --staged      # REVIEW what you're committing
git commit -m "type(scope): desc"   # conventional commit
git checkout main && git merge type/short-name
git branch -d type/short-name      # clean up
```

| Prefix | When | Example |
|---|---|---|
| `feat` | New feature | `feat(auth): add rate limiting` |
| `fix` | Bug fix | `fix(auth): check isActive before issuing JWT` |
| `refactor` | Restructure, no behavior change | `refactor(prisma): create @Global PrismaModule` |
| `test` | Adding tests | `test(auth): add E2E auth matrix` |
| `chore` | Build/CI/tooling | `chore(ci): add GitHub Actions pipeline` |
| `docs` | Documentation | `docs: add deployment runbook` |

## Tools Cheat Sheet

| Tool | Command | Purpose |
|---|---|---|
| pnpm | `pnpm -C apps/api add <pkg>` | Install package in API workspace |
| Prisma | `npx prisma migrate dev --name <desc>` | Create DB migration |
| Prisma Studio | `npx prisma studio` | Visual DB browser (localhost:5555) |
| Jest | `pnpm -C apps/api test` | Run unit tests |
| E2E Tests | `pnpm -C apps/api test:e2e` | Run integration tests |
| Build | `pnpm -C apps/api build` | Compile TypeScript |
| curl | `curl -X POST url -H "Content-Type: application/json" -d '{}'` | Test API endpoints |
| Stripe CLI | `stripe listen --forward-to localhost:3001/checkout/webhook` | Forward webhooks locally |

## VS Code Extensions to Install Now

`Prisma`, `ESLint`, `Prettier`, `Thunder Client`, `GitLens`, `Error Lens`

---

# Phase 1: Configuration & Fail-Fast

**What you learn:** Zod validation, `@nestjs/config`, NestJS Dependency Injection, `@Global()` modules, HTTP exceptions.

**The bugs we're fixing:**
- JWT secret reads `process.env` in 3 places with fallback to `Secret_JWT`. If missing, app starts with `undefined` as the signing key — anyone can forge tokens.
- Auth service returns `{ code: 401 }` inside HTTP 200 responses. Monitoring tools think every login succeeds.
- PrismaService declared in 4 modules = 4 database connection pools (wastes connections, risks exhaustion).

---

### Phase 1.1: Zod Environment Validation

**Read first:** Zod validates data at runtime AND generates TypeScript types from schemas. `z.coerce.number()` converts env var strings (`"3001"`) to numbers. `envSchema.safeParse()` returns `{ success, data, error }` without throwing.

**Branch:** `git checkout -b feat/config-validation`

**Steps:**
1. `pnpm -C apps/api add @nestjs/config zod`
2. Create `apps/api/src/config/env.config.ts`:
   - Zod schema requiring `JWT_SECRET` (min 32 chars), `DATABASE_URL` (starts with `postgresql://`), `PORT` (coerced number, default 3001), `NODE_ENV` (enum, default `development`)
   - Export `validate(config)` function that calls `safeParse` and throws on failure
   - Export `type EnvConfig = z.infer<typeof envSchema>` — auto-derived TypeScript type
3. In `app.module.ts`: add `ConfigModule.forRoot({ isGlobal: true, validate })` to imports
4. In `auth.module.ts`: change `JwtModule.register()` → `JwtModule.registerAsync()` injecting ConfigService:
   ```typescript
   JwtModule.registerAsync({
     imports: [ConfigModule],
     useFactory: (config: ConfigService) => ({
       secret: config.get<string>('JWT_SECRET'),
       signOptions: { expiresIn: '1h' },
     }),
     inject: [ConfigService],
   })
   ```
5. In `jwt.strategy.ts`: inject `ConfigService` in constructor, use `configService.get<string>('JWT_SECRET')` instead of `process.env`
6. In all `.env` files: rename `Secret_JWT` → `JWT_SECRET`

**Test:** Rename `.env` → `.env.bak`. Run `pnpm -C apps/api start:dev`. App MUST crash with Zod error. Restore `.env`. App starts normally.

**Commit:** `git commit -m "feat(config): enforce strict environment validation with Zod"`
**Merge to main.**

---

### Phase 1.2: Global PrismaModule

**Read first:** `@Global()` makes a module's exports available everywhere without importing. Like Spring's singleton `@Bean`. Without it, each module importing PrismaService creates its own instance = its own connection pool.

**Branch:** `git checkout -b refactor/global-prisma`

**Steps:**
1. Create `apps/api/src/prisma/prisma.module.ts`:
   ```typescript
   @Global()
   @Module({ providers: [PrismaService], exports: [PrismaService] })
   export class PrismaModule {}
   ```
2. In `app.module.ts`: add `PrismaModule` to imports, remove `PrismaService` from providers
3. In `auth.module.ts`: remove `PrismaService` from providers
4. In `products.module.ts`: remove `PrismaService` from providers
5. In `user.module.ts`: remove `PrismaService` from providers

**Test:** `pnpm -C apps/api build` — compiles. Start app — works. All endpoints still function.

**Commit:** `git commit -m "refactor(prisma): create @Global PrismaModule singleton"`
**Merge to main.**

---

### Phase 1.3: Fix HTTP Exception Contract

**Read first:** NestJS exceptions (`UnauthorizedException`, `ConflictException`, `NotFoundException`) automatically set the correct HTTP status code. Your controller just calls the service — if the service throws, NestJS catches it and returns the right status. The controller never manually sets status codes.

```typescript
// ❌ Your current pattern (broken):
return { code: 401, message: 'Invalid' };  // HTTP 200 with error in body

// ✅ Professional pattern:
throw new UnauthorizedException('Invalid credentials');  // HTTP 401 automatically
```

**Branch:** `git checkout -b fix/auth-http-contract`

**Steps:**
1. In `auth.service.ts`:
   - User not found → `throw new UnauthorizedException('Invalid email or password')`
   - Password wrong → same message (never reveal which part failed — prevents user enumeration)
   - User `isActive === false` → `throw new UnauthorizedException('Account deactivated')`
   - Success → return `{ token }` only (no code/message wrapping)
2. In `user.service.ts`:
   - Email exists → `throw new ConflictException('Email already registered')`
   - Phone exists → `throw new ConflictException('Phone number already registered')`
   - User not found (delete) → `throw new NotFoundException('User not found')`
   - Remove redundant password regex from `hashPassword()` (DTO validation handles it)
3. In frontend `apps/web/src/lib/api.ts`:
   - Update `login()` to expect `{ token }` instead of `{ code, message, token }`
   - Errors now come as HTTP 401 (not 200), so `requestJson` already throws `HttpError`

**Test:** `curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"wrong@test.com","password":"wrong"}' -w "\nHTTP_STATUS:%{http_code}"` — Assert: `HTTP_STATUS:401`

**Commit:** `git commit -m "fix(auth): throw HTTP exceptions instead of returning error codes in body"`
**Merge to main.**

---

# Phase 2: Resiliency & Security

**What you learn:** NestJS Guards vs Middleware, Exception Filters (the safety net), `PartialType()` mapped DTOs.

---

### Phase 2.1: Rate Limiting

**Read first:** `@nestjs/throttler` is a **Guard** — it runs BEFORE your controller in the pipeline. Guards have access to execution context (which route, what decorators), unlike raw Express middleware. The throttler tracks requests per IP using a TTL store (in-memory by default, Redis for distributed).

**Branch:** `git checkout -b feat/rate-limiting`

**Steps:**
1. `pnpm -C apps/api add @nestjs/throttler`
2. In `app.module.ts`: add `ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])` — generous global default
3. In `auth.controller.ts` on the login method:
   - Add `@UseGuards(ThrottlerGuard)` and `@Throttle({ default: { ttl: 60000, limit: 5 } })` — strict for login
4. Import `ThrottlerGuard` and `Throttle` from `@nestjs/throttler`

**Test:** Hit `/auth/login` 6 times rapidly with curl. Assert: 6th response is HTTP 429.

**Commit:** `git commit -m "feat(auth): add rate limiting to prevent brute-force attacks"`
**Merge to main.**

---

### Phase 2.2: Global Exception Filter

**Read first:** This is the **bottom of the NestJS pipeline** — the safety net. It catches ANY thrown exception (your `UnauthorizedException`, Prisma's `PrismaClientKnownRequestError`, random `TypeError`s) and formats a consistent JSON response. Like Spring's `@ControllerAdvice` or Django's custom 500 handler.

Prisma error codes: `P2002` = unique violation (→409), `P2025` = not found (→404), `P2003` = FK violation (→400).

**Branch:** `git checkout -b feat/global-exception-filter`

**Steps:**
1. Create `apps/api/src/common/filters/http-exception.filter.ts` implementing `ExceptionFilter`
2. Use `@Catch()` (no args) to catch everything
3. Logic: if `HttpException` → use its status/message. If `PrismaClientKnownRequestError` → map error codes. Otherwise → 500 with safe message.
4. Always return `{ statusCode, message, error, timestamp, path }`
5. In `main.ts`: `app.useGlobalFilters(new HttpExceptionFilter())`

**Test:** Create a user with a duplicate email. Assert: clean `{ statusCode: 409, message: 'Record already exists' }` with no Prisma internals.

**Commit:** `git commit -m "feat(core): add global exception filter for consistent error responses"`
**Merge to main.**

---

### Phase 2.3: UpdateProductDto

**Read first:** `PartialType(CreateDto)` copies all class-validator decorators and makes every field optional. It's TypeScript's `Partial<T>` but with runtime validation preserved. Your PATCH endpoint currently fails if you don't send `name` because it reuses `CreateProductDto`.

**Branch:** `git checkout -b fix/update-product-dto`

**Steps:**
1. `pnpm -C apps/api add @nestjs/mapped-types` (if not installed)
2. Create `src/products/dto/update-product.dto.ts`:
   ```typescript
   export class UpdateProductDto extends PartialType(CreateProductDto) {}
   ```
3. Use it in the PATCH controller method

**Test:** PATCH a product with only `{ "grind": "fine" }`. Assert: 200 OK, not 400.

**Commit:** `git commit -m "fix(products): create UpdateProductDto for partial PATCH updates"`
**Merge to main.**

---

# Phase 3: Inventory Domain Logic

**What you learn:** Pure functions, business logic isolation, Prisma transactions, atomic operations.

---

### Phase 3.1: Peak Freshness (Pure Function)

**Read first:** A pure function has no dependencies — no DB, no HTTP, no framework. Input → Output. This makes it trivially testable (no mocking needed). Write your core business rules as pure functions, then call them from services.

**Branch:** `git checkout -b feat/inventory-freshness`

**Steps:**
1. Create `apps/api/src/inventory/freshness.util.ts`
2. Implement `isPeakFreshness(roastDate: Date, now?: Date, windowStart = 7, windowEnd = 21)` returning `{ isPeak: boolean, daysPostRoast: number, peakStart: Date, peakEnd: Date }`

**Test (Unit):** Create `freshness.util.spec.ts`:
- roastDate 3 days ago → `isPeak: false` (too early)
- roastDate 10 days ago → `isPeak: true` (in window)
- roastDate 25 days ago → `isPeak: false` (past peak)
- roastDate in the future → `isPeak: false`

**Commit:** `git commit -m "feat(inventory): implement pure peak freshness computation"`
**Merge to main.**

---

### Phase 3.2: Batch Module

**Branch:** `git checkout -b feat/batch-module`

**Steps:**
1. Create `src/batch/` with module, service, controller
2. `CreateBatchDto`: `@IsUUID() productId`, `@IsDateString() roastDate`, `@IsNotEmpty() batchCode`
3. Routes (admin-protected): `POST /admin/batches`, `GET /admin/batches?productId=`, `GET /admin/batches/:id`
4. Service verifies product exists before creating batch

**Test:** Create batch via curl. Assert: 201. List batches by product. Assert: response contains it.

**Commit:** `git commit -m "feat(batch): add batch tracking module with admin CRUD"`
**Merge to main.**

---

### Phase 3.3: Inventory Service (Atomic Transactions)

**Read first:** `prisma.$transaction([...])` executes multiple operations atomically — all succeed or all rollback. Use `{ increment: qty }` / `{ decrement: qty }` for atomic numeric updates (PostgreSQL row-level locks prevent race conditions).

**Branch:** `git checkout -b feat/inventory-service`

**Steps:**
1. Create `src/inventory/` with module, service, controller
2. Methods: `reserveInventory(batchId, qty)`, `releaseInventory(batchId, qty)`, `adjustInventory(batchId, qty, reason)`
3. Throw `BadRequestException` if reserving more than available

**Test (Unit):** Mock Prisma. Assert `decrement` called correctly. Assert over-reserve throws.

**Commit:** `git commit -m "feat(inventory): implement atomic inventory reservations"`
**Merge to main.**

---

# Phase 4: Public API & Audit Trail

**What you learn:** Separation of concerns, response DTOs, NestJS Interceptors (AOP).

---

### Phase 4.1: Storefront API (Public)

**Branch:** `git checkout -b feat/storefront-api`

**Steps:**
1. Create `src/storefront/` — controller has NO auth guards
2. `GET /storefront/products` — returns only `isActive=true` products with available peak inventory
3. Strip internal fields from response

**Test (E2E):** Hit endpoint with no token. Assert: 200 OK. Assert: `isActive` field absent from response.

**Commit:** `git commit -m "feat(storefront): add public product browsing endpoints"`
**Merge to main.**

---

### Phase 4.2: Audit Logging

**Branch:** `git checkout -b feat/audit-logging`

**Steps:**
1. Create `src/audit/audit.service.ts` with `log(actorId, action, targetType, targetId, metadata?)`
2. Integrate into mutative service methods — pass `req.user.userId` from controller as `actorId`
3. `GET /admin/audit?from=&to=&actorId=` for admin queries

**Test:** Create a product. Query audit log. Assert: entry exists.

**Commit:** `git commit -m "feat(audit): add audit trail for admin mutations"`
**Merge to main.**

---

### Phase 4.3: Consolidate Product Module

**Branch:** `git checkout -b refactor/product-consolidation`

Move `src/product/product.service.ts` into `src/products/`. Remove duplicate `POST /add` route.

**Test:** `pnpm build` compiles. Existing operations work.

**Commit:** `git commit -m "refactor(products): consolidate product module structure"`
**Merge to main.**

---

# Phase 5: Frontend & Checkout

**What you learn:** React Error Boundaries (class components), Stripe webhook architecture, idempotency.

---

### Phase 5.1: Frontend Resilience

**Branch:** `git checkout -b feat/web-resilience`

1. Create `<ErrorBoundary>` class component (React Error Boundaries MUST be class components)
2. Create `<ProductTableSkeleton>` with CSS shimmer animation
3. Fix AuthGuard: `['admin','manager'].includes(role)` instead of `=== 'admin'`

**Test:** Kill the API server. Load dashboard. Assert: skeletons show, sidebar stays intact.

**Commit:** `git commit -m "feat(web): add error boundaries and skeleton loaders"`
**Merge to main.**

---

### Phase 5.2: Stripe Checkout

**Read first:** Never create an Order when the user clicks "Buy." Wait for Stripe's webhook. The flow: Your API creates a Checkout Session → User pays on Stripe's hosted page → Stripe sends `checkout.session.completed` webhook to your API → You create the Order. Use `express.raw()` for the webhook route — Stripe needs raw bytes for signature verification.

**Branch:** `git checkout -b feat/stripe-checkout`

1. `pnpm -C apps/api add stripe`
2. Create `src/checkout/` module
3. `POST /checkout/create-session` — creates Stripe Checkout Session
4. `POST /checkout/webhook` — raw body, signature verification, idempotency check on `paymentIntentId`

**Test:** `stripe listen --forward-to localhost:3001/checkout/webhook`. Trigger test payment.

**Commit:** `git commit -m "feat(checkout): implement Stripe checkout with webhook verification"`
**Merge to main.**

---

# Phase 6: Testing & CI

**What you learn:** E2E testing with supertest, mocking with Jest, GitHub Actions CI, Helmet security.

---

### Phase 6.1: Auth Matrix E2E

**Branch:** `git checkout -b test/auth-matrix`

Tests: no token→401, garbage token→401, valid non-admin→403, valid admin→200, deactivated→401.

**Commit:** `git commit -m "test(auth): add E2E auth matrix covering 401/403/200"`
**Merge to main.**

### Phase 6.2: Unit Tests

**Branch:** `git checkout -b test/unit-tests`

`auth.service.spec.ts`, `freshness.util.spec.ts`, `inventory.service.spec.ts`.

**Commit:** `git commit -m "test(services): add unit tests for auth, inventory, freshness"`
**Merge to main.**

### Phase 6.3: Security & CI

**Branch:** `git checkout -b chore/security-ci`

Add `helmet()` in `main.ts`. Tighten CORS. Create `.github/workflows/ci.yml`.

**Commit:** `git commit -m "chore(ci): add security headers and GitHub Actions pipeline"`
**Merge to main.**

---

# Phase 7: Ship

### Phase 7.1: Documentation

**Branch:** `git checkout -b docs/production-readiness`

Create `.env.example`, `docs/RUNBOOK.md`, `docs/decisions/ADR-001-jwt-over-sessions.md`, update README.

**Commit:** `git commit -m "docs: add runbook, ADR, and deployment docs"`
**Merge to main.**

### Phase 7.2: Deploy

1. Deploy Postgres (Supabase/Neon). 2. Deploy API (Railway/Render) with env vars. 3. `npx prisma migrate deploy`. 4. Deploy Web (Vercel). 5. Smoke test everything.

**Commit:** `git commit -m "chore(release): deploy v1.0.0"`

---

# Incident Response (Production Runbook)

| Symptom | Likely Cause | Fix |
|---|---|---|
| HTTP 500 on all routes | Database unreachable | Check `DATABASE_URL`, restart DB |
| HTTP 500 on one route | Unhandled exception | Check Exception Filter logs, fix service |
| App extremely slow | Event Loop blocked | Find CPU-heavy sync code, add `await` or move to worker |
| "Too many connections" | Multiple PrismaClient instances | Verify `@Global()` PrismaModule (Phase 1.2) |
| Tokens can be forged | `JWT_SECRET` is undefined | Verify Zod validation crashes on missing secret (Phase 1.1) |
| Rate limiting not working | ThrottlerGuard not applied | Check `@UseGuards(ThrottlerGuard)` on route (Phase 2.1) |

# Security Checklist (OWASP Applied)

| Attack | Your Defense |
|---|---|
| SQL Injection | Prisma parameterized queries |
| Brute Force | `@nestjs/throttler` on login |
| XSS | React auto-escapes JSX |
| IDOR | Filter by `req.user.userId` on user routes |
| Missing Headers | `helmet()` middleware |
| Weak Auth | Validated `JWT_SECRET` ≥32 chars |

# Progression Tracker

- [ ] **Level 1:** Understand pipeline. Write a DTO. Use React Query.
- [ ] **Level 2:** Write Exception Filter. Use `registerAsync()`. Mock Prisma in tests.
- [ ] **Level 3:** Implement Throttler. Write Interceptor. Use `$transaction()`. Set up CI.
- [ ] **Level 4:** Design a new module from scratch. Fix N+1 queries. Deploy with rollback plan.

**Start Phase 1.1 now. Say "Go" when ready.**
