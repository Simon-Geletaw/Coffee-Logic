# Coffee Logic: The Complete Engineering Masterclass

> **One document. Read it. Finish the project. Become a senior developer.**
>
> This merges everything: language fundamentals, framework internals, production tools,
> networking, Git workflows, testing strategies, incident response, and the step-by-step
> implementation plan — all tied to YOUR Coffee Logic codebase.

---

## Part A: The Language — TypeScript & Node.js

### A1. What Is TypeScript?
TypeScript is JavaScript with a compile-time type system bolted on top. You write `.ts` files,
the compiler (`tsc`) checks your types, then strips them all away and outputs plain `.js`.

**Coming from Java:** Java types exist at runtime (reflection, instanceof). TypeScript types
**vanish completely** at runtime. This is the single most important thing to internalize.

```typescript
// This is a TypeScript interface — it exists ONLY at compile time
interface User {
  email: string;
  role: 'admin' | 'viewer';
}

// At runtime, this is just a plain JavaScript object — no "User" class exists
const user: User = { email: 'a@b.com', role: 'admin' };
```

**Coming from Python/Django:** Python is dynamically typed — you discover type errors when
code runs. TypeScript catches them before code runs (like Java). But unlike Java, TypeScript
uses **structural typing** (duck typing): if an object has the right shape, it passes.

### A2. Key TypeScript Concepts You Must Know

**Union Types** — "this value can be one of several types":
```typescript
type Status = 'pending' | 'paid' | 'failed';  // only these 3 strings are valid
let s: Status = 'paid';    // ✅
let s: Status = 'unknown'; // ❌ compile error
```

**Generics** — like Java's `<T>` — write code that works with any type:
```typescript
function first<T>(items: T[]): T | undefined {
  return items[0];
}
first<string>(['a', 'b']); // returns 'a', typed as string
first<number>([1, 2, 3]);  // returns 1, typed as number
```

**Utility Types** — TypeScript provides built-in type transformers:
```typescript
Partial<User>    // all fields become optional (used for PATCH/update DTOs)
Pick<User, 'email'>  // only keep the 'email' field
Omit<User, 'password'>  // remove the 'password' field
Record<string, number>  // object with string keys and number values
```

**async/await** — identical concept to Python's `async def` / `await`:
```typescript
async function getUser(id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException();
  return user;
}
```

### A3. Node.js: The Runtime

**The Event Loop** — this is the #1 concept that separates Node from Java:

- **Java/Spring:** Each HTTP request gets its own thread. 100 concurrent users = 100 threads.
  If a thread waits for the database, it sleeps, but other threads keep working.
- **Node.js:** There is ONE thread running an Event Loop. When your code hits `await prisma.query()`,
  Node pauses that function, serves other requests, and resumes when the DB responds.

**Why this matters:** Never write CPU-heavy synchronous code (giant loops, image processing)
in a controller. It blocks the single thread and freezes ALL users. Use `await` for all I/O.

**`process.env`** — how Node reads environment variables (like `os.environ` in Python):
```typescript
const secret = process.env.JWT_SECRET; // string | undefined — NOT guaranteed to exist
```
This is why we need Zod validation — `process.env` values are always `string | undefined`.

### A4. Package Management (pnpm)

Your project uses `pnpm` (faster alternative to `npm`). Key commands:
```bash
pnpm add <package>           # install a dependency
pnpm add -D <package>        # install a dev-only dependency
pnpm -C apps/api add zod     # install into a specific workspace app
pnpm run dev                 # start dev server
pnpm run build               # compile TypeScript to JavaScript
pnpm run test                # run Jest unit tests
pnpm run test:e2e            # run end-to-end tests
```

---

## Part B: The Framework — NestJS

### B1. What Is NestJS?
NestJS is a backend framework for Node.js that enforces structure. Without it, Express apps
become spaghetti. NestJS brings the discipline of Spring Boot / Django to the Node world.

**The Rosetta Stone:**

| Java / Spring | Django | NestJS |
|---|---|---|
| `@RestController` | `views.py` | `@Controller()` |
| `@Service` | Service layer | `@Injectable()` |
| `@Autowired` | — | Constructor injection |
| `@Valid` + DTO | Forms / Serializers | `ValidationPipe` + DTO |
| Spring Security Filters | `@login_required` | `Guards` |
| `@ControllerAdvice` | Custom 500 handler | `Exception Filters` |
| `application.yml` | `settings.py` | `@nestjs/config` |
| Hibernate / JPA | Django ORM | Prisma |

### B2. The Module System
Every feature lives in a **Module**. A module groups its controller, service, and providers:

```typescript
@Module({
  imports: [],          // other modules this module depends on
  controllers: [ProductsController],  // HTTP route handlers
  providers: [ProductsService],       // business logic (injectable)
  exports: [ProductsService],         // what other modules can use
})
export class ProductsModule {}
```

**The DI Container:** When you write `constructor(private prisma: PrismaService)`, NestJS
looks up `PrismaService` in its container and injects the singleton instance. You never
write `new PrismaService()`. This is identical to Spring's IoC container.

### B3. The Request Lifecycle Pipeline (MEMORIZE THIS)

Every HTTP request passes through these layers in exact order:

```
HTTP Request arrives
    │
    ▼
1. MIDDLEWARE  →  Raw HTTP modifications (Helmet security headers, CORS, logging)
    │
    ▼
2. GUARDS     →  "Can this user access this route?" (JWT check, Role check)
                  Returns 401 Unauthorized or 403 Forbidden if denied.
    │
    ▼
3. INTERCEPTORS (before) → Start timer, log request, transform request
    │
    ▼
4. PIPES      →  Validate and transform the request body using class-validator.
                  Returns 400 Bad Request if DTO validation fails.
    │
    ▼
5. CONTROLLER →  Route handler. Delegates to the Service.
    │
    ▼
6. SERVICE    →  Business logic. Talks to Prisma (database).
    │
    ▼
7. INTERCEPTORS (after) → Stop timer, wrap response, cache result
    │
    ▼
8. EXCEPTION FILTER → If ANYTHING above threw an error, this catches it
                       and returns a clean JSON error response.
    │
    ▼
HTTP Response sent
```

**Why this matters:** When debugging, ask yourself: "Which layer failed?"
- Getting 401? → Check your Guard.
- Getting 400 with validation errors? → Check your DTO/Pipe.
- Getting 500? → Check your Service or Exception Filter.

### B4. Decorators — The `@` Syntax
Decorators are functions that attach metadata to classes, methods, or parameters.
NestJS reads this metadata to wire up routes, guards, and pipes.

```typescript
@Controller('products')              // this class handles /products routes
export class ProductsController {
  @Post()                            // handles POST /products
  @UseGuards(JwtAuthGuard, RolesGuard)  // require JWT + admin role
  @Roles('admin')                    // custom decorator setting required role
  create(@Body() dto: CreateProductDto) {  // @Body() extracts request body
    return this.service.create(dto);
  }
}
```

### B5. Prisma — The Database Layer

Prisma replaces Hibernate (Java) and Django ORM. You define models in `schema.prisma`,
run migrations, and get a fully typed client.

**Your workflow when changing the database:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration:
npx prisma migrate dev --name add-inventory-table
# 3. Prisma auto-generates typed client — your code now has new types
```

**Key Prisma operations:**
```typescript
// Find one record (returns null if not found)
const user = await prisma.user.findUnique({ where: { email } });

// Find many with filters and relations
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: { batches: true },  // JOIN — loads related batches
  orderBy: { createdAt: 'desc' },
});

// Create
const product = await prisma.product.create({
  data: { name: 'Ethiopian', origin: 'Yirgacheffe' },
});

// Atomic transaction (all succeed or all rollback)
await prisma.$transaction([
  prisma.inventory.update({ where: { batchId }, data: { reserved: { increment: qty } } }),
  prisma.order.create({ data: orderData }),
]);
```

**Prisma error codes you MUST handle in your Exception Filter:**
- `P2002` → Unique constraint violation (email already exists) → return HTTP 409
- `P2025` → Record not found → return HTTP 404
- `P2003` → Foreign key violation → return HTTP 400

---

## Part C: Production Engineering

### C1. Environment & Configuration
**Rule:** Your app must CRASH on startup if required config is missing. Silent failures
in production are catastrophic (your JWT signs tokens with `undefined` as the secret).

We use `@nestjs/config` + Zod to validate `.env` files at boot time.

### C2. Networking Architecture (How Traffic Reaches Your Code)
```
User Browser
    │
    ▼
DNS (Cloudflare) → resolves coffeelogic.com to IP
    │
    ▼
CDN/Edge (Vercel/Cloudflare) → serves cached static files (Next.js frontend)
    │
    ▼
Reverse Proxy (Nginx / Railway Ingress) → SSL termination (HTTPS → HTTP)
    │
    ▼
Node.js Process (NestJS on port 3001) → your application code
    │
    ▼
PostgreSQL (private subnet, no public IP) → your database
```

**Senior Rules:**
- Your database NEVER has a public IP. Only your app server can reach it.
- Use connection pooling (Prisma default: 5 connections per client instance).
- SSL/TLS terminates at the reverse proxy, not in your Node code.

### C3. Logging & Observability (The Three Pillars)

**Pillar 1 — Logs:** Use NestJS built-in `Logger` (not `console.log`):
```typescript
private readonly logger = new Logger(AuthService.name);
this.logger.log('User logged in', { userId: user.id });    // info
this.logger.warn('Rate limit approaching', { ip });         // warning
this.logger.error('Payment failed', error.stack);            // error
```

**Pillar 2 — Metrics:** Track request count, response times, error rates (Datadog, Prometheus).

**Pillar 3 — Traces:** Follow a single request across services (OpenTelemetry).

### C4. Security Checklist
- **Helmet:** Adds security HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`)
- **CORS:** Restrict which domains can call your API
- **Rate Limiting:** `@nestjs/throttler` blocks brute-force attacks
- **Input Validation:** Every endpoint uses DTOs with class-validator
- **Password Hashing:** bcrypt with salt rounds ≥ 10
- **JWT Secret:** Minimum 32 characters, validated at startup
- **SQL Injection:** Prisma uses parameterized queries — you're safe by default

### C5. Incident Response Runbook

**Incident: API returning 500 errors**
1. Check structured logs for the error stack trace
2. Is it a Prisma error? → Check DATABASE_URL, check if DB is reachable
3. Is it a code error? → Check the last deployment, rollback if needed

**Incident: App extremely slow**
1. Check if the Event Loop is blocked (CPU at 100%)
2. Look for missing `await` (a Promise that's not being awaited)
3. Look for N+1 queries (use Prisma query logging: `log: ['query']`)

**Incident: "Too Many Connections" from PostgreSQL**
1. Check if PrismaService is instantiated multiple times (we fix this in Phase 1.2)
2. Check connection pool size in DATABASE_URL (`?connection_limit=10`)

---

## Part D: Git Workflow & Commit Standards

### D1. Trunk-Based Development
```
main ← production-ready code (protected branch)
  │
  ├── feat/config-validation     ← short-lived feature branch
  ├── fix/auth-http-contract     ← bug fix branch
  ├── refactor/global-prisma     ← cleanup branch
  ├── test/auth-matrix           ← test branch
  └── chore/ci-pipeline          ← tooling branch
```

**The flow for EVERY micro-phase:**
```bash
git checkout main
git pull
git checkout -b type/short-description   # create branch
# ... write code and tests ...
git add .
git commit -m "type(scope): description" # conventional commit
git checkout main
git merge type/short-description         # merge
git branch -d type/short-description     # delete branch
```

### D2. Conventional Commits

| Prefix | When | Example |
|---|---|---|
| `feat` | New feature | `feat(auth): add rate limiting to login` |
| `fix` | Bug fix | `fix(auth): check isActive before issuing JWT` |
| `refactor` | Code restructure, no behavior change | `refactor(prisma): create @Global PrismaModule` |
| `test` | Adding tests | `test(auth): add E2E auth matrix` |
| `chore` | Build/CI/tooling | `chore(ci): add GitHub Actions pipeline` |
| `docs` | Documentation | `docs: add deployment runbook` |

### D3. Pre-Commit Checklist
Before every commit, run:
```bash
git diff --staged          # review exactly what you're committing
pnpm -C apps/api build     # does it compile?
pnpm -C apps/api test       # do tests pass?
```
Never commit `console.log`, `.env` files, or `node_modules`.

---

## Part E: Testing Strategy

### E1. The Test Pyramid
```
         /\        E2E Tests (few — boot full app, test HTTP pipeline)
        /  \
       /----\      Integration Tests (some — test service + real DB)
      /      \
     /--------\    Unit Tests (many — test pure functions, mock deps)
```

### E2. Unit Tests (Jest)
Test pure logic without any framework or database:
```typescript
describe('isPeakFreshness', () => {
  it('returns true when batch is within 7-21 day window', () => {
    const roastDate = new Date('2026-01-01');
    const now = new Date('2026-01-10');  // 9 days post-roast
    expect(isPeakFreshness(roastDate, now)).toBe(true);
  });
});
```

### E3. E2E Tests (Supertest)
Boot the entire NestJS app in memory and make real HTTP requests:
```typescript
const app = (await Test.createTestingModule({ imports: [AppModule] }).compile())
  .createNestApplication();
await app.init();

await request(app.getHttpServer()).get('/admin/products/list').expect(401);
```

---

## Part F: Step-by-Step Implementation Phases

### Phase 1: Configuration & Fail-Fast Integrity

#### Phase 1.1: Zod Environment Validation
**Branch:** `git checkout -b feat/config-validation`
**Concept:** Like Django's `settings.py` raising `ImproperlyConfigured`, we crash on bad env.
**Steps:**
1. Install: `pnpm -C apps/api add @nestjs/config zod`
2. Create `apps/api/src/config/env.config.ts` — Zod schema requiring `JWT_SECRET` (min 32 chars), `DATABASE_URL` (starts with `postgresql://`), `PORT` (number, default 3001)
3. Create `validate()` function that calls `envSchema.safeParse(config)` and throws on failure
4. In `app.module.ts`: import `ConfigModule.forRoot({ isGlobal: true, validate })`
5. In `auth.module.ts`: change `JwtModule.register()` to `JwtModule.registerAsync()` injecting `ConfigService`
6. In `jwt.strategy.ts`: inject `ConfigService`, read `JWT_SECRET` from it
7. Unify `.env` files: rename `Secret_JWT` → `JWT_SECRET`
**Test:** Rename `.env` → `.env.bak`, run `pnpm dev`. Assert: app crashes with Zod error.
**Commit:** `feat(config): enforce strict environment validation with Zod`

#### Phase 1.2: Global PrismaModule
**Branch:** `git checkout -b refactor/global-prisma`
**Concept:** Like Spring's singleton `@Bean` — one DB pool for the entire app.
**Steps:**
1. Create `apps/api/src/prisma/prisma.module.ts` with `@Global()` decorator
2. Add `PrismaService` to both `providers` and `exports`
3. In `app.module.ts`: import `PrismaModule`, remove `PrismaService` from providers
4. In `auth.module.ts`, `products.module.ts`, `user.module.ts`: remove `PrismaService` from providers
**Test:** `pnpm -C apps/api build` compiles successfully. App starts normally.
**Commit:** `refactor(prisma): establish global singleton database connection pool`

#### Phase 1.3: Fix HTTP Exception Contract
**Branch:** `git checkout -b fix/auth-http-contract`
**Concept:** Like Spring's `ResponseStatusException` — throw exceptions, don't return error objects.
**Steps:**
1. In `auth.service.ts`: replace `return { code: 401 }` with `throw new UnauthorizedException()`
2. Add `isActive` check before issuing token
3. In `user.service.ts`: replace `return { status: 400 }` with `throw new ConflictException()`
4. In `user.service.ts`: replace not-found returns with `throw new NotFoundException()`
5. Update frontend `api.ts` login function to handle new response shape
**Test:** Call login with wrong password using curl. Assert: HTTP status is 401 (not 200).
**Commit:** `fix(auth): throw HTTP exceptions instead of returning error codes in body`

---

### Phase 2: Resiliency & Security

#### Phase 2.1: Rate Limiting
**Branch:** `git checkout -b feat/rate-limiting`
**Concept:** Like Django Ratelimit — block brute-force attacks at the application layer.
**Steps:**
1. Install: `pnpm -C apps/api add @nestjs/throttler`
2. In `app.module.ts`: import `ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])`
3. In `auth.controller.ts`: add `@UseGuards(ThrottlerGuard)` and `@Throttle({ default: { ttl: 60000, limit: 5 } })` on login
**Test:** Call `/auth/login` 6 times rapidly. Assert: 6th call returns HTTP 429.
**Commit:** `feat(auth): add rate limiting to prevent brute-force attacks`

#### Phase 2.2: Global Exception Filter
**Branch:** `git checkout -b feat/global-exception-filter`
**Concept:** Like Spring's `@ControllerAdvice` — catch all errors, format them consistently.
**Steps:**
1. Create `apps/api/src/common/filters/http-exception.filter.ts`
2. Handle: `HttpException` → extract status/message. `PrismaClientKnownRequestError` → map P2002→409, P2025→404. Everything else → 500 with safe message.
3. Always return: `{ statusCode, message, error, timestamp, path }`
4. Register in `main.ts`: `app.useGlobalFilters(new HttpExceptionFilter())`
**Test:** Create user with duplicate email. Assert: clean 409 JSON (no leaked DB column names).
**Commit:** `feat(core): add global exception filter for consistent error responses`

#### Phase 2.3: UpdateProductDto
**Branch:** `git checkout -b fix/update-product-dto`
**Concept:** TypeScript's `Partial<T>` applied to DTOs via NestJS `PartialType()`.
**Steps:**
1. Install: `pnpm -C apps/api add @nestjs/mapped-types`
2. Create `update-product.dto.ts`: `export class UpdateProductDto extends PartialType(CreateProductDto) {}`
3. Use it in the PATCH endpoint
**Test:** Send PATCH with only `{ "grind": "fine" }` (no name). Assert: 200 OK.
**Commit:** `fix(products): create UpdateProductDto for partial PATCH updates`

---

### Phase 3: Inventory Domain Logic

#### Phase 3.1: Peak Freshness Pure Function
**Branch:** `git checkout -b feat/inventory-freshness`
**Concept:** Pure functions — no DB, no HTTP, just input→output. Trivially testable.
**Steps:**
1. Create `apps/api/src/inventory/freshness.util.ts`
2. Write `isPeakFreshness(roastDate, now, windowStart=7, windowEnd=21)` returning `{ isPeak, daysPostRoast, peakStart, peakEnd }`
**Test (Unit):** `freshness.util.spec.ts` — test day 3 (not peak), day 10 (peak), day 25 (past peak), future date (not peak).
**Commit:** `feat(inventory): implement pure peak freshness computation`

#### Phase 3.2: Batch Module
**Branch:** `git checkout -b feat/batch-module`
**Steps:**
1. Create `src/batch/batch.module.ts`, `batch.service.ts`, `batch.controller.ts`
2. DTOs: `CreateBatchDto` with `@IsUUID()` productId, `@IsDateString()` roastDate, `@IsNotEmpty()` batchCode
3. Routes: `POST /admin/batches`, `GET /admin/batches?productId=`, `GET /admin/batches/:id`
4. All routes protected by `JwtAuthGuard` + `RolesGuard`
**Test:** Create a batch via curl with admin token. Assert: 201 Created.
**Commit:** `feat(batch): add batch tracking module with admin CRUD`

#### Phase 3.3: Inventory Service
**Branch:** `git checkout -b feat/inventory-service`
**Steps:**
1. Create `src/inventory/inventory.module.ts`, `inventory.service.ts`, `inventory.controller.ts`
2. Methods: `adjustInventory(batchId, qty, reason)`, `reserveInventory(batchId, qty)`, `releaseInventory(batchId, qty)`
3. Use `prisma.$transaction` for atomic reserve/release
4. Throw `BadRequestException` if reserving more than available
**Test (Unit):** Mock Prisma. Assert reserve calls `decrement`. Assert over-reserve throws.
**Commit:** `feat(inventory): implement atomic inventory reservations`

---

### Phase 4: Public API & Audit Trail

#### Phase 4.1: Storefront Controller
**Branch:** `git checkout -b feat/storefront-api`
**Concept:** Separate public endpoints from admin endpoints — different controllers, different DTOs.
**Steps:**
1. Create `src/storefront/storefront.module.ts`, `storefront.controller.ts`, `storefront.service.ts`
2. `GET /storefront/products` — NO auth guard, filters `isActive=true` with available peak inventory
3. `GET /storefront/products/:id` — public product detail
4. Strip internal fields (createdAt, updatedAt, isActive) from response
**Test (E2E):** Hit `/storefront/products` without token. Assert: 200 OK with products.
**Commit:** `feat(storefront): add public product browsing endpoints`

#### Phase 4.2: Audit Logging
**Branch:** `git checkout -b feat/audit-logging`
**Steps:**
1. Create `src/audit/audit.module.ts`, `audit.service.ts`
2. Method: `log(actorId, action, targetType, targetId, metadata?)`
3. Integrate into product create/update/delete, user create/delete, inventory adjust
4. Pass `req.user.userId` from controller to service as `actorId`
5. Admin query: `GET /admin/audit?from=&to=&actorId=`
**Test:** Create a product. Query audit log. Assert: entry exists with correct action.
**Commit:** `feat(audit): add audit trail for all admin mutations`

#### Phase 4.3: Consolidate Product Module
**Branch:** `git checkout -b refactor/product-consolidation`
**Steps:**
1. Move `src/product/product.service.ts` into `src/products/`
2. Remove duplicate `POST /add` route (keep only `POST /`)
3. Update all imports
**Test:** `pnpm build` compiles. All existing product operations still work.
**Commit:** `refactor(products): consolidate product module structure`

---

### Phase 5: Frontend & Checkout

#### Phase 5.1: Frontend Resilience
**Branch:** `git checkout -b feat/web-resilience`
**Steps:**
1. Create `<ErrorBoundary>` class component wrapping dashboard sections
2. Create `<ProductTableSkeleton>` with CSS shimmer animation for loading states
3. Fix `AuthGuard` role check: `['admin','manager'].includes(role)` instead of `=== 'admin'`
**Test:** Disconnect API. Assert: skeleton loaders show, sidebar stays intact.
**Commit:** `feat(web): add error boundaries and skeleton loaders`

#### Phase 5.2: Stripe Checkout
**Branch:** `git checkout -b feat/stripe-checkout`
**Steps:**
1. Install: `pnpm -C apps/api add stripe`
2. Create `src/checkout/checkout.module.ts`, `checkout.service.ts`, `checkout.controller.ts`
3. `POST /checkout/create-session` — creates Stripe Checkout Session
4. `POST /checkout/webhook` — receives Stripe events with raw body parsing and signature verification
5. On `checkout.session.completed`: check idempotency (paymentIntentId unique), create Order, reserve inventory
**Test:** Use Stripe CLI: `stripe listen --forward-to localhost:3001/checkout/webhook`. Trigger test payment.
**Commit:** `feat(checkout): implement Stripe checkout with webhook verification`

---

### Phase 6: Testing & CI

#### Phase 6.1: Auth Matrix E2E Tests
**Branch:** `git checkout -b test/auth-matrix`
**Steps:**
1. Create `test/auth.e2e-spec.ts`
2. Tests: no token→401, garbage token→401, valid non-admin→403, valid admin→200, deactivated user→401
**Test:** `pnpm test:e2e` — all pass green.
**Commit:** `test(auth): add full E2E auth matrix covering 401/403/200`

#### Phase 6.2: Unit Test Suite
**Branch:** `git checkout -b test/unit-tests`
**Steps:**
1. `auth.service.spec.ts` — login success, login failure, password hashing
2. `freshness.util.spec.ts` — peak window edge cases
3. `inventory.service.spec.ts` — reserve, release, over-reserve
**Test:** `pnpm test` — all pass.
**Commit:** `test(services): add unit tests for auth, inventory, and freshness`

#### Phase 6.3: Security & CI Pipeline
**Branch:** `git checkout -b chore/security-ci`
**Steps:**
1. In `main.ts`: add `app.use(helmet())` — install `helmet` package
2. Tighten CORS: `app.enableCors({ origin: ['https://coffeelogic.com'] })`
3. Create `.github/workflows/ci.yml`: checkout → install → lint → test → build
**Test:** Push to GitHub. Assert: CI pipeline runs and passes.
**Commit:** `chore(ci): add security headers and GitHub Actions pipeline`

---

### Phase 7: Ship Day

#### Phase 7.1: Documentation
**Branch:** `git checkout -b docs/production-readiness`
**Steps:**
1. Create `.env.example` with all required variables documented
2. Create `docs/RUNBOOK.md` — how to check health, rollback migrations, restart the app
3. Create `docs/decisions/ADR-001-jwt-over-sessions.md` — your first Architecture Decision Record
4. Update `README.md` with local setup and deployment instructions
**Commit:** `docs: add runbook, ADR, and deployment documentation`

#### Phase 7.2: Deploy
**Steps:**
1. Deploy PostgreSQL to managed provider (Supabase, Railway, Neon)
2. Deploy API to Railway/Render — set all env vars from `.env.example`
3. Run `npx prisma migrate deploy` against production DB
4. Deploy Web to Vercel — connect GitHub repo
5. Smoke test: login, create product, browse storefront, verify rate limiting
**Commit:** `chore(release): deploy v1.0.0`

---

## Part G: Quick Reference — Tools Cheat Sheet

| Tool | Purpose | Key Command |
|---|---|---|
| **pnpm** | Package manager | `pnpm add <pkg>` |
| **Prisma** | Database ORM | `npx prisma migrate dev`, `npx prisma studio` |
| **Jest** | Test runner | `pnpm test`, `pnpm test:e2e` |
| **ESLint** | Code quality | `pnpm lint` |
| **Prettier** | Code formatting | `pnpm format` |
| **Git** | Version control | `git checkout -b`, `git commit -m` |
| **curl** | API testing | `curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{...}'` |
| **Prisma Studio** | Visual DB browser | `npx prisma studio` (opens localhost:5555) |
| **Stripe CLI** | Webhook testing | `stripe listen --forward-to localhost:3001/checkout/webhook` |
| **Helmet** | Security headers | `app.use(helmet())` in main.ts |
| **Docker** | Containerization | `docker compose up -d` (starts Postgres + Redis) |

---

**You now have everything in one place. Start at Phase 1.1. Follow the branch→code→test→commit flow for each phase. By Phase 7.2, you will have shipped a production application and internalized the patterns of a senior backend engineer.**
