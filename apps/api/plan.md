# Coffee Logic: Complete Teaching Guide & Production Deployment Plan

> **One document. Read each phase. Build it. Test it. Commit it. Move to the next phase.**
> **By Phase 7 you will have shipped a production app and mastered NestJS, Prisma, and TypeScript.**

---

## Quick Start Before Phase 1

### Prerequisites

**Development Environment:**
- Node.js 18+ (`node -v`)
- pnpm (`npm install -g pnpm`)
- VS Code with extensions: `Prisma`, `ESLint`, `Prettier`, `Thunder Client`, `GitLens`, `Error Lens`

**Local Infrastructure (Docker):**
- Docker Desktop (includes Docker + Docker Compose)
- PostgreSQL 14+ (via Docker: `docker run -d postgres:16`)
- Redis (via Docker: `docker run -d redis:7`)
- pgAdmin (database GUI via Docker)

**Version Control & Collaboration:**
- Git 2.30+
- GitHub account + SSH keys setup
- GitHub Desktop (optional GUI)

### Required Reading (30 minutes)
Read these sections in order. They explain decisions you'll make in every phase:
1. **Your Background Mapped to This Stack** — See how your Java/Django/C# experience maps to NestJS
2. **TypeScript vs Java: The Critical Differences** — Why runtime validation matters
3. **Node.js: One Thread, Not Many** — The event loop (CRUCIAL misconception)
4. **The NestJS Request Pipeline** — HTTP lifecycle (MEMORIZE)
5. **Production Considerations** section before Phase 1
6. **Modern Tools & Infrastructure** — Technologies used in each phase

---

## Modern Web System Tools & Technologies

### Why Modern Tools Matter

Traditional monolith → Microservices/Distributed systems require:
- **Containerization** (Docker) — reproducible environments
- **Orchestration** (Kubernetes/Docker Compose) — manage multiple containers
- **Load Balancing** (Nginx, HAProxy) — distribute traffic
- **Monitoring** (Prometheus, Datadog) — know when things break
- **CI/CD** (GitHub Actions) — automated testing & deployment
- **Job Queues** (Redis BullMQ) — async processing
- **Caching** (Redis) — performance at scale

### Tools by Category

#### **Containerization & Image Registry**
| Tool | Purpose | Phases | Cost |
|---|---|---|---|
| Docker | Container runtime + image layers | 1-7 | Free |
| Docker Compose | Multi-container orchestration (local) | 1-6 | Free |
| Docker Hub | Public image registry | 3+ | Freemium |
| GitHub Container Registry | Private images on GitHub | 6+ | Free (private) |
| AWS ECR | Private registry (AWS ecosystem) | 7 | Paid |

**When to use:**
- Phase 1+: Local development (`docker-compose up`)
- Phase 5+: Build images for each service
- Phase 7: Push to registry before deployment

#### **Infrastructure & Deployment**
| Tool | Purpose | Phases | Cost |
|---|---|---|---|
| Railway | Deploy Node.js app (best for beginners) | 6-7 | Freemium ($5/month) |
| Render | Deploy Node.js app + PostgreSQL | 6-7 | Freemium ($7/month) |
| Fly.io | Deploy globally with regions | 6-7 | Paid ($5/month) |
| AWS EC2 | VMs (full control, complex) | 7+ | Paid (starts free tier) |
| Heroku | Deprecated, use Railway instead | — | — |

**For Coffee Logic:** Start with Railway (easiest), graduate to AWS if needed.

#### **Load Balancing & Reverse Proxy**
| Tool | Purpose | Phases | When to Use |
|---|---|---|---|
| Nginx | Reverse proxy, load balancer, static files | 5+ | Always before app |
| HAProxy | Load balancer, higher performance | 6+ | High traffic |
| Cloudflare | CDN, DDoS, SSL termination | 5+ | Default choice |
| AWS ALB | AWS-native load balancer | 7+ | If using AWS |

**Configuration Example (Nginx):**
```nginx
# /etc/nginx/nginx.conf
upstream coffee_api {
  server localhost:3001;
  server localhost:3002;  # Second instance for redundancy
}

server {
  listen 80;
  server_name api.coffelogic.com;

  # Reverse proxy to app instances
  location / {
    proxy_pass http://coffee_api;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }

  # Health check endpoint
  location /health {
    access_log off;
    proxy_pass http://coffee_api;
  }
}
```

#### **Caching & Session Storage**
| Tool | Purpose | Phases | Docker |
|---|---|---|---|
| Redis | In-memory cache, rate limiting, sessions | 2+ | `redis:7` |
| Memcached | Simple caching (legacy, avoid) | — | — |
| PostgreSQL | Primary database | 1+ | `postgres:16` |

**Redis Usage:**
```bash
# Local development
docker run -d -p 6379:6379 redis:7

# Connect from Node.js
import { Redis } from 'ioredis';
const redis = new Redis('redis://localhost:6379');
await redis.set('user:123:token', tokenValue, 'EX', 3600);  // Expire in 1 hour
```

#### **Job Queues & Background Processing**
| Tool | Purpose | Phases | Use Case |
|---|---|---|---|
| BullMQ | Queue library (Redis-backed) | 5+ | Generate reports, send emails |
| RabbitMQ | Message broker | 6+ | Complex workflows |
| AWS SQS | Serverless queue | 7+ | AWS-native, auto-scaling |
| Apache Kafka | Event streaming | 7+ | Real-time analytics |

**BullMQ Example (Phase 5+):**
```typescript
import Bull from 'bull';

const reportQueue = new Bull('generate-reports', {
  redis: 'redis://localhost:6379',
});

// Producer (API endpoint)
@Post('reports/generate')
async generateReport(@Body() dto: GenerateReportDto) {
  const job = await reportQueue.add(
    { userId: req.user.id, type: dto.type },
    { delay: 0, attempts: 3 },
  );
  return { jobId: job.id, status: 'queued' };
}

// Consumer (background worker)
reportQueue.process(async (job) => {
  console.log(`Processing report for user ${job.data.userId}`);
  // Heavy computation here — doesn't block API
  return { success: true, reportUrl: 's3://...' };
});

reportQueue.on('completed', (job) => {
  console.log(`Report job ${job.id} completed`);
  // Notify user via webhook/email
});
```

#### **Monitoring & Observability**
| Tool | Purpose | Phases | Cost |
|---|---|---|---|
| Prometheus | Metrics collection | 6+ | Free |
| Grafana | Metrics visualization | 6+ | Free |
| Datadog | All-in-one monitoring | 6+ | ~$15/month |
| Sentry | Error tracking | 5+ | Freemium |
| ELK Stack | Logs (Elasticsearch, Logstash, Kibana) | 6+ | Free + hosting |
| New Relic | APM (application performance) | 7+ | Paid |
| AWS CloudWatch | AWS-native logging | 7+ | Minimal (included in AWS) |

**Minimal Setup (Phase 5+):**
```bash
# Prometheus + Grafana via Docker
docker-compose up -d prometheus grafana
# Access at http://localhost:3000 (Grafana)
```

#### **CI/CD & Automation**
| Tool | Purpose | Phases | Cost |
|---|---|---|---|
| GitHub Actions | CI/CD directly in GitHub | 5+ | Free (2000 min/month) |
| GitLab CI/CD | GitLab's native CI | — | Free (uses GitLab) |
| Azure Pipelines | Microsoft's CI/CD | — | Free (180 min/month) |
| Jenkins | Self-hosted CI (old-school) | — | Free (self-hosted) |

**Simple GitHub Actions Example (Phase 5):**
```yaml
# .github/workflows/test.yml
name: Test & Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm -C apps/api test

      - name: Build
        run: pnpm -C apps/api build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

#### **Scripting & Automation**
| Language | Purpose | When to Use | Difficulty |
|---|---|---|---|
| Bash/Shell | System automation, deployments | 4+ | Easy |
| Node.js | npm scripts, custom scripts | 3+ | Easy |
| Python | Data processing, DevOps | 6+ | Medium |
| Terraform | Infrastructure as Code | 7+ | Medium |
| Ansible | Server provisioning | 7+ | Hard |

**Bash Script Example (Phase 6+):**
```bash
#!/bin/bash
# scripts/deploy.sh — Deploy to production

set -e  # Exit on error

echo "🚀 Deploying Coffee Logic to production..."

# 1. Run tests
echo "Testing..."
pnpm -C apps/api test
pnpm -C apps/web test

# 2. Build
echo "Building API..."
pnpm -C apps/api build

echo "Building Web..."
pnpm -C apps/web build

# 3. Docker build
echo "Building Docker image..."
docker build -f apps/api/Dockerfile -t coffee-api:latest .

# 4. Push to registry
echo "Pushing to registry..."
docker tag coffee-api:latest myregistry.azurecr.io/coffee-api:latest
docker push myregistry.azurecr.io/coffee-api:latest

# 5. Deploy
echo "Deploying to Railway..."
railway deploy

echo "✅ Deployment complete!"
```

#### **Performance Testing & Load Testing**
| Tool | Purpose | Phases | Use |
|---|---|---|---|
| k6 | Load & performance testing | 6+ | Simulate 1000 users |
| Artillery | Simple load testing | 6+ | Production smoke tests |
| JMeter | Legacy load testing | — | Avoid |
| Locust | Python-based load testing | 6+ | Complex scenarios |

**k6 Example (Phase 6+):**
```typescript
// tests/load.js — Simulate 100 concurrent users
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m30s', target: 100 }, // Ramp up to 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
};

export default () => {
  const res = http.get('http://localhost:3001/api/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
};
```

Run: `k6 run tests/load.js`

#### **API Development & Testing**
| Tool | Purpose | When to Use |
|---|---|---|
| Postman | API testing GUI | Phase 2+ (complex workflows) |
| Insomnia | Lightweight API testing | Phase 1+ (default) |
| Thunder Client | VS Code REST client | Phase 1+ (easiest) |
| curl | Command-line HTTP | Phase 1+ (always) |

#### **Database Tools**
| Tool | Purpose | GUI | When |
|---|---|---|---|
| Prisma Studio | Visual DB browser | Yes | Phase 1+ |
| pgAdmin | PostgreSQL admin | Yes | Phase 1+ |
| DBeaver | Universal DB tool | Yes | Phase 5+ |
| psql | PostgreSQL CLI | No | Always |

**Launch Prisma Studio:**
```bash
npx prisma studio
# Opens http://localhost:5555 with full database GUI
```

---

### Tool Selection by Phase

| Phase | Key Tools | Purpose | Config File |
|---|---|---|---|
| **1** | Docker Compose, Prisma Studio, ESLint | Local dev setup | `docker-compose.yml` |
| **2** | Rate limiting (Redis), Exception Filters | Stability | — |
| **3** | pgAdmin, Prisma CLI | Database | `prisma/schema.prisma` |
| **4** | Audit logging | Compliance | — |
| **5** | BullMQ (Redis), GitHub Actions | Background jobs + CI | `.github/workflows/test.yml` |
| **6** | Jest, k6, Sentry | Testing + monitoring | `jest.config.js` |
| **7** | Railway/AWS, Nginx, Datadog | Production | `docker-compose.prod.yml` |

---

## Foundations (Read Before Phase 1)

### Your Background Mapped to This Stack

| Java / Spring | Django | .NET / C# | NestJS | Purpose |
|---|---|---|---|---|
| `@RestController` | `views.py` | `[ApiController]` | `@Controller()` | Route HTTP requests |
| `@Service` | Service layer | Service class | `@Injectable()` | Business logic |
| `@Autowired` | — | Dependency Injection | Constructor injection | Wire dependencies |
| `@Valid` + DTO | Forms / Serializers | `[ApiController]` | `ValidationPipe` + DTO | Input validation |
| `@ControllerAdvice` | Custom error handler | Exception filters | `Exception Filters` | Central error handling |
| Spring Security Filters | `@login_required` | `[Authorize]` | `Guards` | Authorization & auth |
| `application.yml` | `settings.py` | `appsettings.json` | `@nestjs/config` + Zod | Configuration |
| Hibernate / JPA | Django ORM | Entity Framework | Prisma ORM | Database access |
| Maven/Gradle | pip/Poetry | NuGet | pnpm (monorepo) | Package management |
| JUnit + Mockito | pytest | xUnit/Moq | Jest + ts-jest | Testing framework |

**Key Insight:** NestJS borrows from Spring's composition (modules, dependency injection, decorators) but with JavaScript/TypeScript's runtime flexibility. You'll recognize patterns.

---

### TypeScript vs Java: The Critical Differences

> This is the #1 misconception that breaks production systems.

**Types vanish at runtime.** In Java, `instanceof User` works because the class exists at runtime compiled into bytecode. In TypeScript, interfaces/types are **completely erased** after compilation into JavaScript.

```typescript
// TYPESCRIPT SOURCE (what you write)
interface User { email: string; role: 'admin' | 'viewer'; }

const action = (user: User) => {
  if (user.role === 'admin') { /* compile-time check ✅ */ }
}

// COMPILED JAVASCRIPT (what runs)
const action = (user) => {
  if (user.role === 'admin') { /* NO TYPE INFO ❌ */ }
}
```

This means:
- TypeScript catches YOUR mistakes at compile time ✅
- TypeScript does NOT protect against bad input from clients/databases at runtime ❌
- **That's why we use THREE layers of validation:**

```typescript
// Layer 1: TypeScript (compile-time)
// Catches: You accidentally pass wrong type
interface CreateUserDto { email: string; password: string; }

// Layer 2: class-validator (runtime - HTTP body validation)
// Catches: API client sends { "email": "not-an-email" }
export class CreateUserDto {
  @IsEmail() email: string;
  @MinLength(8) password: string;
}

// Layer 3: Zod (runtime - environment & database validation)
// Catches: DATABASE_URL is missing or DATABASE_URL=bad_string
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
```

**Structural Typing (Duck Typing):** If it has the right shape, TypeScript accepts it.
```typescript
interface HasEmail { email: string; }
const obj = { email: 'a@b.com', name: 'Alice', age: 30 };
const valid: HasEmail = obj; // ✅ TypeScript accepts — obj has 'email' field
```

**Key Types to Know:**
- `Union`: `'admin' | 'viewer'` — one of these strings
- `Partial<T>`: all fields optional
- `Pick<T, 'field'>`: extract specific fields
- `Omit<T, 'field'>`: exclude fields
- `Promise<T>`: async function return type
- Generics: `<T>` for reusable patterns

📚 **External Resource:** [TypeScript Handbook: Type Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

### Node.js: One Thread, Not Many

> This is your second critical misconception.

**Java:** Each HTTP request runs in its own thread. 100 users = ~100 threads.

**Node.js:** ALL requests share ONE thread via the **Event Loop**.

```
Event Loop (single thread):
1. Request A arrives → Start processing → Hits prisma.query() → PAUSE A
2. Request B arrives → Start processing → Hits prisma.query() → PAUSE B
3. Wait, database responds to A → Resume A → Send response
4. Database responds to B → Resume B → Send response
```

**The Golden Rule:** When code hits `await` (a database query, HTTP call, file read), Node:
- Pauses that function
- Moves to the next request
- Resumes when I/O completes

**The Deadly Sin:** Never run CPU-heavy loops in a controller — it blocks ALL users.

```typescript
// ❌ NEVER DO THIS — blocks event loop for 30 seconds
@Get('report')
async getReport() {
  let sum = 0;
  for (let i = 0; i < 10_000_000_000; i++) {
    sum += Math.random(); // CPU-heavy, blocks all other requests
  }
  return { sum };
}

// ✅ DO THIS — use Worker Threads or offload to a job queue
@Get('report')
async getReport() {
  // Offload heavy computation to background job queue
  const result = await jobQueue.enqueue('compute-heavy-report');
  return result;
}
```

**Rule:** `async/await` for I/O (DB, HTTP, files). Never synchronous CPU loops.

📚 **External Resources:**
- [Node.js Event Loop Explained](https://nodejs.org/en/docs/guides/blocking-vs-non-blocking/)
- [Jake Archibald: In The Loop (talk)](https://www.youtube.com/watch?v=cCOL7MC4Pl0) — 26 min, visualized event loop

---

### The NestJS Request Pipeline (MEMORIZE)

```
┌─────────────────────────────────────────────────────────────────┐
│ Request arrives from client (HTTP GET /api/users, JWT token)    │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Middleware (execution order: registered order)               │
│    - CORS headers                                               │
│    - Request logging (correlation ID)                           │
│    - Raw body parsing (needed for Stripe webhooks)              │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Guards (decision: pass or reject?)                           │
│    - JWT validation (@JwtAuthGuard) → 401 if token invalid     │
│    - Role check (@RolesGuard) → 403 if user lacks permission  │
│    - Rate limiting (@ThrottlerGuard) → 429 if too many reqs   │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Interceptors (before controller) — request transformation   │
│    - Add trace IDs, performance timing                         │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Pipes (validate & transform body)                           │
│    - DTO validation (@IsEmail, @MinLength) → 400 if invalid   │
│    - Type coercion (string "123" → number 123)                │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Controller Method (YOUR CODE)                               │
│    - getUsers(): Promise<User[]>                               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Service Method (YOUR LOGIC)                                 │
│    - await prisma.user.findMany() — database query             │
│    - May throw: UnauthorizedException, NotFoundException, etc. │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Interceptors (after controller) — response transformation  │
│    - Add response headers, transform data structure           │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Exception Filter (THE SAFETY NET)                           │
│    - Catches ANY thrown exception:                             │
│    - UnauthorizedException → HTTP 401 ✅                       │
│    - NotFoundException → HTTP 404 ✅                           │
│    - TypeError (bug in code) → HTTP 500 + logs                 │
│    - Returns consistent JSON: { statusCode, message, error }  │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ Response sent to client (HTTP 200/401/403/404/500, JSON body)  │
└─────────────────────────────────────────────────────────────────┘
```

**Debugging by HTTP Status:**
- **401** → Guard rejected you (bad/missing/expired JWT)
- **403** → Guard rejected you (bad role, insufficient permission)
- **400** → Pipe rejected you (DTO validation failed, check `message`)
- **429** → Guard rejected you (rate limit exceeded)
- **500** → Service threw, check **Exception Filter** logs and check backend logs for full error
- **502/503** → API server is down or database is down

📚 **External Resource:** [NestJS Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)

---

### Git Flow for This Project

Every phase below follows this exact flow:

```bash
# Step 1: Get latest main branch
git checkout main && git pull origin main

# Step 2: Create feature branch
git checkout -b type/short-name
# Example: git checkout -b feat/rate-limiting

# Step 3: Code + test locally
# ... write code, run tests, commit regularly ...

# Step 4: Review your changes before committing
git add .
git diff --staged                    # Review what you're committing
git commit -m "type(scope): message"  # See table below for format

# Step 5: Merge to main
git push origin type/short-name
# Create PR on GitHub for code review, OR:
git checkout main && git merge type/short-name

# Step 6: Clean up
git branch -d type/short-name
```

**Conventional Commit Format:**
```
type(scope): description

[optional body with more details]

[optional footer: Closes #123]
```

| Prefix | When | Example |
|---|---|---|
| `feat` | New feature or capability | `feat(auth): add rate limiting to login` |
| `fix` | Bug fix | `fix(auth): check isActive before issuing JWT` |
| `refactor` | Code restructure without behavior change | `refactor(prisma): create @Global PrismaModule` |
| `test` | Adding or updating tests | `test(auth): add E2E auth matrix` |
| `chore` | Build/CI/tooling, no user-facing code | `chore(ci): add GitHub Actions pipeline` |
| `docs` | Documentation | `docs: add deployment runbook` |
| `perf` | Performance improvement | `perf(query): add database index on User.email` |

📚 **External Resource:** [Conventional Commits](https://www.conventionalcommits.org/)

---

### Tools Cheat Sheet

| Tool | Command | Purpose | Docs |
|---|---|---|---|
| pnpm | `pnpm -C apps/api add <pkg>` | Install package in API workspace | [pnpm](https://pnpm.io) |
| Prisma Generate | `npx prisma generate` | Regenerate `@prisma/client` types | [Prisma CLI](https://www.prisma.io/docs/reference/api-reference/command-reference) |
| Prisma Migrate | `npx prisma migrate dev --name <desc>` | Create & apply DB migration | [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) |
| Prisma Studio | `npx prisma studio` | GUI database browser at localhost:5555 | Built-in |
| Jest Unit Tests | `pnpm -C apps/api test` | Run all `*.spec.ts` files | [Jest](https://jestjs.io) |
| E2E Tests | `pnpm -C apps/api test:e2e` | Run integration tests | [supertest](https://github.com/visionmedia/supertest) |
| Build | `pnpm -C apps/api build` | Compile TypeScript to JavaScript | Built-in |
| Dev Server | `pnpm -C apps/api start:dev` | Watch mode + auto-reload | [NestJS CLI](https://docs.nestjs.com/cli/overview) |
| curl | `curl -X POST url -H "Authorization: Bearer TOKEN" -d '{}'` | Test API endpoints | [curl](https://curl.se) |
| PostgreSQL Client | `psql postgresql://user:pass@localhost:5432/db` | Direct database access | [psql](https://www.postgresql.org/docs/current/app-psql.html) |
| Docker Compose | `docker-compose up -d` | Start PostgreSQL + Redis locally | [Docker Compose](https://docs.docker.com/compose) |

---

### Production Considerations (Architecture Decisions)

Before you code, understand these decisions. We'll implement them progressively:

**1. Authentication Strategy: JWT vs Sessions**

| Aspect | Sessions | JWT | Coffee Logic |
|---|---|---|---|
| Storage | Server (Redis/DB) | Client (token) | JWT |
| Scalability | Multiple servers need shared Redis | Stateless (no server sync) | ✅ Stateless |
| Token revocation | Immediate (delete from Redis) | Delayed (wait for expiry) | ❌ No revocation yet |
| Best for | Monolith + session data | Microservices + APIs | ✅ We use it |

**Decision:** We use JWT for stateless scalability, but add refresh tokens + blacklist (Phase 6).

**2. Rate Limiting Strategy**

| Strategy | Storage | Scalability | Accuracy | Coffee Logic |
|---|---|---|---|---|
| In-memory Map | Node memory | ❌ Per-server (resets on restart) | Perfect | Phase 1-2 |
| Redis | Redis server | ✅ Shared globally | Perfect | Phase 5+ |
| Database | PostgreSQL | ⚠️ Slower queries | Good | Alternative |

**Current:** In-memory (Phase 1-2). Upgrade to Redis before production (Phase 5).

**3. Database Connection Pooling**

NestJS with Prisma creates one connection pool per `PrismaService` instance. If you declare PrismaService in 4 modules, you get 4 pools = 4x the connections.

**Fix (Phase 1.2):** Create `@Global() PrismaModule` so all modules share one instance.

**4. Caching Strategy (Phases 5-6)**

```
Client Request
    ↓
Cache Layer (Redis) ← "Is this data fresh?" YES → Return cached
    ↓ NO (cache miss)
Database Query
    ↓
Update Cache + Return
```

We'll add caching for expensive queries (product listing, dashboard stats).

**5. Background Jobs (Phase 6)**

```
POST /admin/generate-report
    ↓
Save job to queue (Redis BullMQ)
    ↓
Return { jobId: "xyz" } immediately ✅ (user doesn't wait 5 minutes)
    ↓
Background worker processes report
    ↓
Webhook/polling notifies client when ready
```

Heavy operations (PDF generation, bulk exports) go to job queues.

---

## Production Deployment Architecture

```
┌─────────────────┐
│   Client (Web)  │
│   React App     │
│   (Vercel)      │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────────────┐
│   CDN / Reverse Proxy           │
│   Cloudflare / Nginx            │
│   - SSL/TLS termination         │
│   - Rate limiting (DDoS)        │
│   - Request logging             │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Load Balancer (optional)      │
│   Distributes to 2-3 API nodes  │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   NestJS API Servers (Render)   │
│   - Instance 1                  │
│   - Instance 2 (if needed)      │
│   - Health check endpoint       │
└────────┬────────────────────────┘
         │
    ┌────┴───┬────────────┬──────────┐
    ↓        ↓            ↓          ↓
┌────────┐ ┌──────┐ ┌─────────┐ ┌────────┐
│ Prisma │ │Redis │ │ Stripe  │ │SendGrid│
│  ORM   │ │Cache │ │Webhooks │ │ Email  │
└────┬───┘ └──────┘ └─────────┘ └────────┘
     ↓
┌──────────────────────────────────┐
│ PostgreSQL Database (Supabase)   │
│ - Auto-backups                   │
│ - Point-in-time recovery         │
│ - Connection pooling (PgBouncer) │
└──────────────────────────────────┘
```

---

## Phase 1: Configuration & Fail-Fast (DONE ✅)

**What you learn:** Zod validation, `@nestjs/config`, NestJS Dependency Injection, `@Global()` modules, HTTP exceptions.

**Time estimate:** 2-3 hours

**Tools Required:**
- **Docker** — PostgreSQL & Redis (local development)
- **Prisma CLI** — Database schema management
- **pnpm** — Package management
- **esLint/Prettier** — Code formatting
- **VS Code** — IDE with Prisma extension

**Local Infrastructure (Phase 1):**
```bash
# Start Docker services
docker-compose up -d postgres redis

# Verify running
docker ps

# Test PostgreSQL
psql postgresql://coffee:secure_password@localhost:5432/coffee_logic

# Test Redis
redis-cli ping  # Output: PONG
```

**Docker Compose Configuration:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-coffee}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
      POSTGRES_DB: coffee_logic
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-coffee}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - '5050:80'
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Development Setup Script:**
```bash
#!/bin/bash
# scripts/dev-setup.sh

set -e

echo "🔧 Setting up local environment..."

# Create .env.local
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✅ Created .env.local"
fi

# Start services
docker-compose up -d
echo "🐳 Services started (postgres, redis, pgadmin)"

# Wait for database
echo "⏳ Waiting for PostgreSQL..."
docker-compose exec -T postgres pg_isready -U coffee || sleep 5

# Migrate schema
echo "🔄 Running migrations..."
pnpm -C apps/api prisma migrate dev

echo "✅ Setup complete!"
echo "📊 Prisma Studio: pnpm -C apps/api prisma studio"
echo "📈 pgAdmin: http://localhost:5050 (admin@example.com / admin)"
echo "🚀 Start API: pnpm -C apps/api start:dev"
```

Run setup:
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

**The bugs we're fixing:**
1. JWT secret reads `process.env` in multiple places with fallback to string literal "Secret_JWT" → If missing, app starts with `undefined` as signing key → Anyone can forge tokens
2. Auth service returns `{ code: 401 }` inside HTTP 200 responses → Monitoring tools think every login succeeds
3. PrismaService declared in 4 modules → 4 database connection pools → risks connection exhaustion

---

### Phase 1.1: Zod Environment Validation ✅

**What you learn:** Runtime schema validation, type inference from schemas, fail-fast on startup.

**Background:** Zod validates data at runtime AND generates TypeScript types from schemas. `z.coerce.number()` converts env var strings (`"3001"`) to actual numbers. `safeParse()` returns `{ success, data, error }` without throwing.

**Branch:** `feat/config-validation`

**Steps:**

1. Install dependencies:
   ```bash
   pnpm -C apps/api add @nestjs/config zod
   ```

2. Create `apps/api/src/config/env.config.ts`:
   ```typescript
   import { z } from 'zod';

   const envSchema = z.object({
     // JWT_SECRET must exist and be at least 32 characters (OWASP minimum)
     JWT_SECRET: z.string().min(32, 'JWT_SECRET must be 32+ characters'),

     // DATABASE_URL must be valid PostgreSQL connection string
     DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

     // PORT converts string to number, defaults to 3001
     PORT: z.coerce.number().int().default(3001),

     // NODE_ENV restricts to known values
     NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

     // Optional Stripe key for Phase 5
     STRIPE_SECRET_KEY: z.string().optional(),
   });

   export type EnvConfig = z.infer<typeof envSchema>;

   export const validate = (config: Record<string, unknown>): EnvConfig => {
     const result = envSchema.safeParse(config);

     if (!result.success) {
       const errors = result.error.flatten().fieldErrors;
       console.error('❌ Invalid environment configuration:');
       Object.entries(errors).forEach(([field, msgs]) => {
         console.error(`  ${field}: ${msgs?.join(', ')}`);
       });
       throw new Error('Environment validation failed');
     }

     return result.data;
   };
   ```

3. In `app.module.ts`, import and use the validator:
   ```typescript
   import { validate } from './config/env.config';

   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         validate,
         envFilePath: ['.env.local', '.env'],
       }),
       // ... rest of imports
     ],
   })
   export class AppModule {}
   ```

4. In `auth.module.ts`, use dynamic JWT configuration:
   ```typescript
   import { ConfigModule, ConfigService } from '@nestjs/config';

   @Module({
     imports: [
       ConfigModule,
       JwtModule.registerAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (configService: ConfigService) => ({
           secret: configService.get<string>('JWT_SECRET'),
           signOptions: { expiresIn: '1h' },
         }),
       }),
       // ...
     ],
   })
   export class AuthModule {}
   ```

5. In `jwt.strategy.ts`, inject ConfigService:
   ```typescript
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class JwtStrategy extends PassportStrategy(Strategy) {
     constructor(private configService: ConfigService) {
       super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         ignoreExpiration: false,
         secretOrKey: configService.get<string>('JWT_SECRET'),
       });
     }

     validate(payload: any) {
       return { userId: payload.sub, email: payload.email };
     }
   }
   ```

6. Update `.env`, `.env.local`, `.env.production`:
   ```bash
   # Generate secure JWT secret (min 64 chars):
   # Linux: openssl rand -base64 32
   # Windows (PowerShell): [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

   JWT_SECRET=your-64-character-random-string-here
   DATABASE_URL=postgresql://user:password@localhost:5432/coffee_logic
   PORT=3001
   NODE_ENV=development
   ```

**Test locally:**
```bash
# Rename .env to break it
mv .env .env.bak
pnpm -C apps/api start:dev

# Expect output:
# ❌ Invalid environment configuration:
#  JWT_SECRET: JWT_SECRET must be 32+ characters
# Error: Environment validation failed

# Restore .env
mv .env.bak .env
pnpm -C apps/api start:dev
# App starts normally ✅
```

**Security:** Never commit `.env` files. Add to `.gitignore`:
```bash
.env
.env.local
```

**Commit:**
```bash
git commit -m "feat(config): enforce strict environment validation with Zod"
```

**Learning Outcome:**
- ✅ Understand runtime validation vs compile-time types
- ✅ Know when to use Zod (external data: env vars, API responses, database results)
- ✅ Fail fast on startup (good for Docker health checks)

📚 **External Resources:**
- [Zod Documentation](https://zod.dev)
- [NestJS Config Module](https://docs.nestjs.com/techniques/configuration)
- [12factor.net: Environment Configuration](https://12factor.net/config)

---

### Phase 1.2: Global PrismaModule ✅

**What you learn:** Singleton pattern with `@Global()`, avoiding multiple database connection pools.

**Background:** `@Global()` makes a module's exports available everywhere without importing. Without it, each module importing PrismaService creates its own instance = its own connection pool (waste + risk).

PrismaService declares a connection pool to PostgreSQL. Default pool size: 10 connections (configurable in `datasource` block). With 4 PrismaService instances, you use 4×10=40 connections.

**Branch:** `refactor/global-prisma`

**Steps:**

1. Create `apps/api/src/prisma/prisma.module.ts`:
   ```typescript
   import { Module, Global } from '@nestjs/common';
   import { PrismaService } from './prisma.service';

   @Global()
   @Module({
     providers: [PrismaService],
     exports: [PrismaService],
   })
   export class PrismaModule {}
   ```

2. In `apps/api/src/prisma/prisma.service.ts`, add graceful shutdown:
   ```typescript
   import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
   import { PrismaClient } from '@prisma/client';

   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
     async onModuleInit() {
       await this.$connect();
     }

     async onModuleDestroy() {
       await this.$disconnect();
     }
   }
   ```

3. In `app.module.ts`, add PrismaModule and remove PrismaService from any other modules:
   ```typescript
   @Module({
     imports: [
       ConfigModule.forRoot({ /* ... */ }),
       PrismaModule,  // Add this
       AuthModule,
       UserModule,
       ProductsModule,
       // ...
     ],
   })
   export class AppModule {}
   ```

4. In `auth.module.ts`, `user.module.ts`, `products.module.ts` — remove `PrismaService` from providers and exports:
   ```typescript
   // ❌ REMOVE these lines from each module:
   // providers: [PrismaService, AuthService],
   // exports: [PrismaService],

   // ✅ KEEP only business logic:
   @Module({
     imports: [ConfigModule, JwtModule.registerAsync(...)],
     providers: [AuthService, JwtStrategy],
     controllers: [AuthController],
   })
   export class AuthModule {}
   ```

**Test:**
```bash
pnpm -C apps/api build  # Compile check
pnpm -C apps/api start:dev

# Every request works? ✅
# Try: curl -X GET http://localhost:3001/api/products
```

**Verify:** Start the app, make a request, check logs for only ONE "PrismaClient connected" message.

**Commit:**
```bash
git commit -m "refactor(prisma): create @Global PrismaModule singleton"
```

**Learning Outcome:**
- ✅ Understand NestJS dependency injection (singletons vs factories)
- ✅ Know when to use `@Global()` (exactly once: shared services like DB, config)
- ✅ Avoid connection pool exhaustion

📚 **External Resources:**
- [NestJS Global Modules](https://docs.nestjs.com/modules#global-modules)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)

---

### Phase 1.3: Fix HTTP Exception Contract ✅

**What you learn:** NestJS exception hierarchy, contract-based error responses, error message security.

**Background:**

Currently, your auth service returns:
```json
HTTP 200 OK
{ "code": 401, "message": "Invalid email or password" }
```

Problems:
- Monitoring tools see HTTP 200 (success) not HTTP 401 (unauthorized)
- Client code needs to check both HTTP status AND response body
- API is amateur-hour

Professional pattern:
```json
HTTP 401 Unauthorized
{ "statusCode": 401, "message": "Invalid email or password" }
```

NestJS exceptions automatically set the right HTTP status. Your controller just calls the service. If the service throws, NestJS catches it and returns the status code.

**Branch:** `fix/auth-http-contract`

**Steps:**

1. In `apps/api/src/auth/auth.service.ts`:
   ```typescript
   import { UnauthorizedException, Injectable } from '@nestjs/common';

   @Injectable()
   export class AuthService {
     async validateUser(email: string, password: string) {
       const user = await this.prisma.user.findUnique({ where: { email } });

       if (!user) {
         throw new UnauthorizedException('Invalid email or password');
       }

       const passwordValid = await bcrypt.compare(password, user.password);
       if (!passwordValid) {
         throw new UnauthorizedException('Invalid email or password');
       }

       if (!user.isActive) {
         throw new UnauthorizedException('Account has been deactivated');
       }

       return user;
     }

     async login(user: { userId: string; email: string }) {
       const token = this.jwtService.sign({
         sub: user.userId,
         email: user.email,
       });

       return { token };  // Only return token, not code/message
     }
   }
   ```

2. In `apps/api/src/user/user.service.ts`:
   ```typescript
   import { ConflictException, NotFoundException, Injectable } from '@nestjs/common';

   @Injectable()
   export class UserService {
     async createUser(dto: CreateUserDto) {
       const existingEmail = await this.prisma.user.findUnique({
         where: { email: dto.email },
       });

       if (existingEmail) {
         throw new ConflictException('Email already registered');
       }

       const existingPhone = await this.prisma.user.findUnique({
         where: { phone: dto.phone },
       });

       if (existingPhone) {
         throw new ConflictException('Phone number already registered');
       }

       const hashedPassword = await bcrypt.hash(dto.password, 10);

       return this.prisma.user.create({
         data: {
           email: dto.email,
           phone: dto.phone,
           password: hashedPassword,
           firstName: dto.firstName,
           lastName: dto.lastName,
         },
       });
     }

     async deleteUser(id: string) {
       const user = await this.prisma.user.findUnique({ where: { id } });

       if (!user) {
         throw new NotFoundException('User not found');
       }

       return this.prisma.user.delete({ where: { id } });
     }
   }
   ```

3. In frontend `apps/web/src/lib/api.ts`, update HTTP client:
   ```typescript
   export async function requestJson(
     url: string,
     options?: RequestInit,
   ): Promise<any> {
     const response = await fetch(url, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...options?.headers,
       },
     });

     if (!response.ok) {
       const error = await response.json();
       throw new HttpError(
         response.status,
         error.message || 'Request failed',
       );
     }

     return response.json();
   }

   export class HttpError extends Error {
     constructor(public status: number, message: string) {
       super(message);
     }
   }

   export async function login(email: string, password: string) {
     const { token } = await requestJson('/auth/login', {
       method: 'POST',
       body: JSON.stringify({ email, password }),
     });
     // Errors (401, 403, 500) thrown automatically now ✅
     return token;
   }
   ```

**Test:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrong"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"

# Expected output:
# {"statusCode":401,"message":"Invalid email or password","error":"Unauthorized","timestamp":"2024-01-15T10:30:00.000Z","path":"/auth/login"}
# HTTP_STATUS:401
```

**Commit:**
```bash
git commit -m "fix(auth): throw HTTP exceptions instead of returning error codes in body"
```

**Learning Outcome:**
- ✅ Understand NestJS exception hierarchy (UnauthorizedException, ConflictException, etc.)
- ✅ Know that HTTP status codes carry meaning (401 = unauthorized, 403 = forbidden, 409 = conflict)
- ✅ Security: Never reveal whether an email exists during login ("Invalid email or password" not "User not found")

📚 **External Resources:**
- [NestJS Built-in HTTP Exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)
- [HTTP Status Codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OWASP: User Enumeration](https://owasp.org/www-community/attacks/User_Enumeration)

---

## Phase 2: Resiliency & Security (STARTED)

**What you learn:** NestJS Guards vs Middleware, Exception Filters (the safety net), PartialType mapped DTOs.

**Time estimate:** 3-4 hours

**Tools Required:**
- **Redis** — Rate limiting storage (already running from Phase 1)
- **Thunder Client** — Test rate limiting with rapid requests
- **Docker Compose** — Manage local services
- **curl** — CLI testing
- **ESLint/Prettier** — Code quality

**Why this matters:** These foundation patterns prevent 70% of production incidents (bad error responses, crashes on invalid input, unhandled permissions).

**Testing Infrastructure (Phase 2):**
```bash
# Load testing rate limits
for i in {1..10}; do curl -X POST http://localhost:3001/auth/login; sleep 0.1; done

# Monitor Redis (rate limit data store)
redis-cli MONITOR  # Watch all commands in real-time
redis-cli INFO stats  # View connection stats
```

**Local Monitoring Setup (Phase 2+):**
```yaml
# docker-compose.extension.yml - Optional monitoring
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    depends_on:
      - prometheus
```

Run: `docker-compose -f docker-compose.yml -f docker-compose.extension.yml up -d`

---

### Phase 2.1: Rate Limiting

**Learning Goal:** Understand NestJS Guards (execution context, decision points).

**Background:**

`@nestjs/throttler` is a **Guard** — it runs BEFORE your controller in the pipeline. Guards have access to execution context (route, decorators, metadata), unlike raw Express middleware.

The throttler tracks requests per IP using a TTL store:
- In-memory (Phase 1-2): Works for single server, resets on restart
- Redis (Phase 5+): Works for distributed servers, survives restarts

**Branch:** `feat/rate-limiting`

**Steps:**

1. Install:
   ```bash
   pnpm -C apps/api add @nestjs/throttler
   ```

2. In `app.module.ts`:
   ```typescript
   import { ThrottlerModule } from '@nestjs/throttler';

   @Module({
     imports: [
       ThrottlerModule.forRoot([
         {
           ttl: 60000,      // Time window in milliseconds (60 seconds)
           limit: 20,       // Max requests per window (generous global default)
         },
       ]),
       // ... rest of imports
     ],
   })
   export class AppModule {}
   ```

3. In `auth.controller.ts`, add strict limit on login:
   ```typescript
   import { UseGuards } from '@nestjs/common';
   import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

   @Controller('auth')
   export class AuthController {
     @UseGuards(ThrottlerGuard)
     @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 requests per 60 seconds
     @Post('login')
     async login(@Body() dto: LoginDto) {
       return this.authService.login(dto);
     }

     @UseGuards(ThrottlerGuard)
     @Throttle({ default: { limit: 3, ttl: 60000 } })  // 3 requests per 60 seconds
     @Post('register')
     async register(@Body() dto: CreateUserDto) {
       return this.userService.createUser(dto);
     }
   }
   ```

4. In `main.ts`, register the guard globally:
   ```typescript
   import { ThrottlerGuard } from '@nestjs/throttler';

   async function bootstrap() {
     const app = await NestFactory.create(AppModule);

     // Remove old manual rate limiting middleware (lines 12-55) ✅

     app.useGlobalGuards(app.get(ThrottlerGuard));

     // ... rest of configuration
   }
   ```

**Test:**
```bash
# Hit login endpoint 6 times rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password"}' \
    -w "\n"
done

# Output for request 6:
# HTTP 429 Too Many Requests
# { "statusCode": 429, "message": "ThrottlerException: Too Many Requests" }
```

**Commit:**
```bash
git commit -m "feat(auth): add rate limiting to prevent brute-force attacks"
```

**Learning Outcome:**
- ✅ Understand NestJS Guards (execution point, context, decision)
- ✅ Know rate limiting strategies (IP-based, user-based, endpoint-specific)
- ✅ Recognize that in-memory doesn't scale (upgrade to Redis for production)

📚 **External Resources:**
- [NestJS Throttler Module](https://docs.nestjs.com/security/rate-limiting)
- [OWASP: Brute Force Protection](https://owasp.org/www-community/attacks/Brute_force_attack)

---

### Phase 2.2: Global Exception Filter

**Learning Goal:** Create the safety net for unhandled exceptions.

**Background:**

This is the **bottom of the NestJS pipeline** — the last chance to handle ANY thrown exception and return a consistent JSON response.

Your service throws:
- `UnauthorizedException` → must become HTTP 401
- `NotFoundException` → must become HTTP 404
- `PrismaClientKnownRequestError` (P2002 = unique violation) → must become HTTP 409
- Random `TypeError` (bug in code) → must become HTTP 500 with sanitized message

Without an exception filter, some exceptions escape as HTML error pages (amateur).

**Branch:** `feat/global-exception-filter`

**Steps:**

1. Create `apps/api/src/common/filters/http-exception.filter.ts`:
   ```typescript
   import {
     ExceptionFilter,
     Catch,
     ArgumentsHost,
     HttpException,
     HttpStatus,
     Logger,
   } from '@nestjs/common';
   import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

   @Catch()  // Catch ALL exceptions
   export class HttpExceptionFilter implements ExceptionFilter {
     private readonly logger = new Logger(HttpExceptionFilter.name);

     catch(exception: unknown, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const request = ctx.getRequest<Request>();
       const response = ctx.getResponse<Response>();

       let status = HttpStatus.INTERNAL_SERVER_ERROR;
       let message = 'Internal server error';
       let error = 'InternalServerError';

       // Handle NestJS HTTP exceptions
       if (exception instanceof HttpException) {
         status = exception.getStatus();
         const exceptionResponse = exception.getResponse();
         message = (exceptionResponse as any).message || exception.message;
         error = (exceptionResponse as any).error || error;
       }
       // Handle Prisma unique constraint violation (P2002)
       else if (exception instanceof PrismaClientKnownRequestError) {
         if (exception.code === 'P2002') {
           status = HttpStatus.CONFLICT;
           const field = (exception.meta?.target as string[])?.[0];
           message = `Record with this ${field} already exists`;
           error = 'Conflict';
         } else if (exception.code === 'P2025') {
           // Record not found
           status = HttpStatus.NOT_FOUND;
           message = 'Record not found';
           error = 'NotFound';
         } else {
           // Generic database error
           this.logger.error(`Prisma error ${exception.code}:`, exception.message);
           message = 'Database operation failed';
         }
       }
       // Handle other exceptions (bugs in code)
       else if (exception instanceof Error) {
         this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
         message = 'Internal server error';
       }

       const responseBody = {
         statusCode: status,
         message,
         error,
         timestamp: new Date().toISOString(),
         path: request.url,
       };

       this.logger.error(
         `[${request.method}] ${request.url} → ${status} ${message}`,
       );

       response.status(status).json(responseBody);
     }
   }
   ```

2. In `main.ts`, register the filter globally:
   ```typescript
   import { HttpExceptionFilter } from './common/filters/http-exception.filter';

   async function bootstrap() {
     const app = await NestFactory.create(AppModule);

     app.useGlobalFilters(new HttpExceptionFilter());

     // ... rest of configuration
   }
   ```

**Test:**
```bash
# Test 409 Conflict: Create duplicate user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"SecurePass123!","phone":"1234567890"}'

# Repeat the same request
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"SecurePass123!","phone":"1234567890"}'

# Expected:
# HTTP 409 Conflict
# { "statusCode": 409, "message": "Record with this email already exists", ... }
```

**Commit:**
```bash
git commit -m "feat(core): add global exception filter for consistent error responses"
```

**Learning Outcome:**
- ✅ Understand exception filters (last-chance safety net in pipeline)
- ✅ Know Prisma error codes and how to map them to HTTP status
- ✅ Protect production from leaking exception details

📚 **External Resources:**
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [HTTP Status Codes (RFC 7231)](https://tools.ietf.org/html/rfc7231#section-6)

---

### Phase 2.3: UpdateProductDto

**Learning Goal:** Use `PartialType()` for PATCH operations.

**Background:**

Currently your PATCH endpoint reuses `CreateProductDto`:
```typescript
@Patch(':id')
updateProduct(@Body() updateProduct: CreateProductDto) { ... }
```

Problem: If CreateProductDto requires `name`, `roastLevel`, `grind`, but you only send `{ "grind": "fine" }`, validation fails with HTTP 400.

Solution: `PartialType(CreateProductDto)` copies all validators but makes every field optional.

```typescript
export class UpdateProductDto extends PartialType(CreateProductDto) {}
// Result: all fields optional, all validators preserved
```

**Branch:** `fix/update-product-dto`

**Steps:**

1. Install (if not already):
   ```bash
   pnpm -C apps/api add @nestjs/mapped-types
   ```

2. Create `apps/api/src/products/dto/update-product.dto.ts`:
   ```typescript
   import { PartialType } from '@nestjs/mapped-types';
   import { CreateProductDto } from './create-product.dto';

   export class UpdateProductDto extends PartialType(CreateProductDto) {}
   ```

3. In `apps/api/src/products/products.controller.ts`:
   ```typescript
   import { UpdateProductDto } from './dto/update-product.dto';

   @Patch(':id')
   updateProduct(
     @Param('id') id: string,
     @Body() updateProduct: UpdateProductDto,  // ✅ Changed
   ) {
     return this.productsService.updateProduct(id, updateProduct);
   }
   ```

**Test:**
```bash
# Patch with only one field
curl -X PATCH http://localhost:3001/admin/products/123 \
  -H "Content-Type: application/json" \
  -d '{"grind":"fine"}' \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: HTTP 200 OK (not 400)
```

**Commit:**
```bash
git commit -m "fix(products): create UpdateProductDto for partial PATCH updates"
```

**Learning Outcome:**
- ✅ Use `PartialType()` for PATCH DTOs
- ✅ Understand REST semantics (PUT=full replacement, PATCH=partial update)
- ✅ Preserve validation without making fields optional manually

📚 **External Resources:**
- [NestJS Mapped Types](https://docs.nestjs.com/techniques/serialization#partial-type)
- [REST: PUT vs PATCH](https://tools.ietf.org/html/rfc7231#section-4.3)

---

## Phase 3: Inventory Domain Logic (IN PROGRESS)

**What you learn:** Pure functions, business logic isolation, Prisma transactions, atomic operations.

**Time estimate:** 4-5 hours

**Tools & Scripts Required:**
- **Jest** — Unit testing (pure functions)
- **Prisma Studio** — Database browser
- **pgAdmin** — Database admin UI
- **Docker** — PostgreSQL for test isolation
- **GitHub Actions** (Phase 3.3+) — Run tests on commit

**Why this matters:** Domain logic is the heart of your app. Pure functions make it testable. Transactions make it reliable.

**Testing Infrastructure (Phase 3):**
```bash
# Run unit tests for pure functions
pnpm -C apps/api test -- freshness.util.spec.ts

# Watch mode (re-run on file change)
pnpm -C apps/api test --watch -- freshness.util.spec.ts

# Coverage report
pnpm -C apps/api test --coverage
```

**Database Testing Setup:**
```typescript
// jest.config.js - Configure test database
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

```typescript
// test/setup.ts - Prepare test database
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

beforeAll(async () => {
  // Use test DATABASE_URL from .env.test
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  await prisma.$disconnect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**GitHub Actions: Automated Testing (Phase 3.3+):**
```yaml
# .github/workflows/test.yml
name: Unit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm -C apps/api test
        env:
          DATABASE_URL: postgresql://postgres:test@postgres:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/coverage-final.json
```

Enable on GitHub: Settings → Actions → General → Allow GitHub Actions

---

### Phase 3.1: Peak Freshness (Pure Function) ✅

**Learning Goal:** Write pure functions for core business rules.

**Background:**

A pure function has NO side effects:
- No database calls
- No HTTP requests
- No random numbers (use injected `now` instead)
- No framework dependencies

Input → Output. Same input always = same output. Trivially testable.

Your coffee bean freshness rule: Peak between days 7-21 after roasting.

```
Roasted today (day 0)
         ↓
   Days 1-6: Degassing (not ready)
         ↓
   Days 7-21: PEAK (best flavor)
         ↓
   Days 22+: Stale (still drinkable, not peak)
```

**Branch:** `feat/inventory-freshness`

**Steps:**

1. Create `apps/api/src/inventory/freshness.util.ts`:
   ```typescript
   export interface FreshnessResult {
     isPeak: boolean;
     daysPostRoast: number;
     peakWindowStart: number;  // Day number (e.g., 7)
     peakWindowEnd: number;    // Day number (e.g., 21)
     peakStart: Date;          // Actual date when peak begins
     peakEnd: Date;            // Actual date when peak ends
   }

   /**
    * Calculate coffee batch freshness based on roast date.
    *
    * Coffee reaches peak flavor 7-21 days after roasting due to CO2 degassing.
    * Before day 7: Still degassing, flavors not developed
    * Days 7-21: Peak window, optimal extraction and taste
    * After day 21: Begins to stale, oils oxidize
    *
    * @param roastDate - When the beans were roasted (UTC)
    * @param now - Current time (can inject for testing) (default: Date.now())
    * @param windowStart - Peak window start in days (default: 7)
    * @param windowEnd - Peak window end in days (default: 21)
    *
    * @returns Freshness analysis with peak status and timeline
    *
    * @example
    * const result = isPeakFreshness(new Date('2024-01-10'));
    * // If today is 2024-01-20:
    * // { isPeak: true, daysPostRoast: 10, peakStart: Date(...), peakEnd: Date(...) }
    */
   export function isPeakFreshness(
     roastDate: Date,
     now: Date = new Date(),
     windowStart: number = 7,
     windowEnd: number = 21,
   ): FreshnessResult {
     const roastTime = roastDate.getTime();
     const nowTime = now.getTime();

     // Calculate days elapsed since roasting
     const daysPostRoast = Math.floor(
       (nowTime - roastTime) / (1000 * 60 * 60 * 24),
     );

     // Calculate peak window dates
     const millisecondsPerDay = 1000 * 60 * 60 * 24;
     const peakStart = new Date(roastTime + windowStart * millisecondsPerDay);
     const peakEnd = new Date(roastTime + windowEnd * millisecondsPerDay);

     // Check if currently in peak window
     const isPeak = daysPostRoast >= windowStart && daysPostRoast <= windowEnd;

     return {
       isPeak,
       daysPostRoast,
       peakWindowStart: windowStart,
       peakWindowEnd: windowEnd,
       peakStart,
       peakEnd,
     };
   }
   ```

2. Create `apps/api/src/inventory/freshness.util.spec.ts` (unit tests):
   ```typescript
   import { isPeakFreshness } from './freshness.util';

   describe('isPeakFreshness', () => {
     const roastDate = new Date('2024-01-10T00:00:00Z');

     it('should return isPeak=false when roasted 3 days ago (too early)', () => {
       const now = new Date('2024-01-13T00:00:00Z'); // Day 3
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(false);
       expect(result.daysPostRoast).toBe(3);
     });

     it('should return isPeak=true when roasted 10 days ago (in window)', () => {
       const now = new Date('2024-01-20T00:00:00Z'); // Day 10
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(true);
       expect(result.daysPostRoast).toBe(10);
     });

     it('should return isPeak=true on day 7 (window start)', () => {
       const now = new Date('2024-01-17T00:00:00Z'); // Day 7
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(true);
       expect(result.daysPostRoast).toBe(7);
     });

     it('should return isPeak=true on day 21 (window end)', () => {
       const now = new Date('2024-01-31T00:00:00Z'); // Day 21
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(true);
       expect(result.daysPostRoast).toBe(21);
     });

     it('should return isPeak=false when roasted 25 days ago (past peak)', () => {
       const now = new Date('2024-02-04T00:00:00Z'); // Day 25
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(false);
       expect(result.daysPostRoast).toBe(25);
     });

     it('should return isPeak=false on future date (roast not yet happened)', () => {
       const now = new Date('2024-01-09T00:00:00Z'); // Before roast
       const result = isPeakFreshness(roastDate, now);

       expect(result.isPeak).toBe(false);
       expect(result.daysPostRoast).toBe(-1);
     });

     it('should support custom window size', () => {
       const now = new Date('2024-01-14T00:00:00Z'); // Day 4
       const result = isPeakFreshness(
         roastDate,
         now,
         3,  // window starts day 3
         5,  // window ends day 5
       );

       expect(result.isPeak).toBe(true);
       expect(result.daysPostRoast).toBe(4);
       expect(result.peakWindowStart).toBe(3);
       expect(result.peakWindowEnd).toBe(5);
     });

     it('should return correct Date objects for peak window', () => {
       const result = isPeakFreshness(roastDate);

       expect(result.peakStart).toEqual(new Date('2024-01-17T00:00:00Z')); // +7 days
       expect(result.peakEnd).toEqual(new Date('2024-01-31T00:00:00Z'));   // +21 days
     });
   });
   ```

3. Run tests:
   ```bash
   pnpm -C apps/api test -- freshness.util.spec.ts

   # Output:
   # PASS  src/inventory/freshness.util.spec.ts
   #   isPeakFreshness
   #     ✓ should return isPeak=false when roasted 3 days ago
   #     ✓ should return isPeak=true when roasted 10 days ago
   #     ✓ should return isPeak=true on day 7 (window start)
   #     ✓ should return isPeak=true on day 21 (window end)
   #     ✓ should return isPeak=false when roasted 25 days ago
   #     ✓ should return isPeak=false on future date
   #     ✓ should support custom window size
   #     ✓ should return correct Date objects for peak window
   #
   # Tests: 8 passed, 8 total
   ```

4. Export from module `apps/api/src/inventory/index.ts`:
   ```typescript
   export * from './freshness.util';
   ```

**Commit:**
```bash
git commit -m "feat(inventory): implement pure peak freshness computation with tests"
```

**Learning Outcome:**
- ✅ Write pure functions (testable, predictable, no side effects)
- ✅ Use dependency injection for time (pass `now` parameter for predictable testing)
- ✅ Achieve 100% code coverage with pure functions
- ✅ Separate business logic from infrastructure (no Prisma, no framework)

📚 **External Resources:**
- [Pure Functions in JavaScript](https://www.freecodecamp.org/news/pure-functions-in-javascript/)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)

---

### Phase 3.2: Batch Module

**Learning Goal:** Create a module from scratch (controller, service, DTO).

**Branch:** `feat/batch-module`

**Steps:**

1. Generate module:
   ```bash
   pnpm -C apps/api exec nest g module batch
   pnpm -C apps/api exec nest g service batch
   pnpm -C apps/api exec nest g controller batch
   ```

2. Create `apps/api/src/batch/dto/create-batch.dto.ts`:
   ```typescript
   import { IsUUID, IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

   export class CreateBatchDto {
     @IsUUID()
     productId: string;

     @IsDateString()
     roastDate: string;  // ISO 8601: "2024-01-10T00:00:00Z"

     @IsNotEmpty()
     @IsOptional()
     batchCode?: string;  // e.g., "BATCH-2024-01-001"
   }
   ```

3. Create `apps/api/src/batch/batch.service.ts`:
   ```typescript
   import { Injectable, NotFoundException } from '@nestjs/common';
   import { PrismaService } from 'src/prisma/prisma.service';
   import { CreateBatchDto } from './dto/create-batch.dto';

   @Injectable()
   export class BatchService {
     constructor(private prisma: PrismaService) {}

     async createBatch(dto: CreateBatchDto) {
       // Verify product exists
       const product = await this.prisma.product.findUnique({
         where: { id: dto.productId },
       });

       if (!product) {
         throw new NotFoundException('Product not found');
       }

       return this.prisma.batch.create({
         data: {
           productId: dto.productId,
           roastDate: new Date(dto.roastDate),
           batchCode: dto.batchCode,
         },
       });
     }

     async getBatchesByProduct(productId: string) {
       return this.prisma.batch.findMany({
         where: { productId },
       });
     }

     async getBatchById(id: string) {
       const batch = await this.prisma.batch.findUnique({ where: { id } });

       if (!batch) {
         throw new NotFoundException('Batch not found');
       }

       return batch;
     }
   }
   ```

4. Create `apps/api/src/batch/batch.controller.ts`:
   ```typescript
   import {
     Controller,
     Post,
     Get,
     Param,
     Query,
     Body,
     UseGuards,
   } from '@nestjs/common';
   import { BatchService } from './batch.service';
   import { CreateBatchDto } from './dto/create-batch.dto';
   import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
   import { RolesGuard } from 'src/auth/guard/roles.guard';
   import { Roles } from 'src/common/decorator/roles.decorator';

   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('admin', 'manager')
   @Controller('admin/batches')
   export class BatchController {
     constructor(private batchService: BatchService) {}

     @Post()
     async createBatch(@Body() dto: CreateBatchDto) {
       return this.batchService.createBatch(dto);
     }

     @Get()
     async getBatches(@Query('productId') productId: string) {
       if (productId) {
         return this.batchService.getBatchesByProduct(productId);
       }
       return [];
     }

     @Get(':id')
     async getBatch(@Param('id') id: string) {
       return this.batchService.getBatchById(id);
     }
   }
   ```

5. Update `apps/api/src/batch/batch.module.ts`:
   ```typescript
   import { Module } from '@nestjs/common';
   import { BatchService } from './batch.service';
   import { BatchController } from './batch.controller';

   @Module({
     controllers: [BatchController],
     providers: [BatchService],
   })
   export class BatchModule {}
   ```

6. In `app.module.ts`, add `BatchModule` to imports:
   ```typescript
   import { BatchModule } from './batch/batch.module';

   @Module({
     imports: [
       // ... existing imports
       BatchModule,
     ],
   })
   export class AppModule {}
   ```

**Test:**
```bash
# Create batch
curl -X POST http://localhost:3001/admin/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId":"12345-uuid",
    "roastDate":"2024-01-10T00:00:00Z",
    "batchCode":"BATCH-2024-01-001"
  }'

# List batches for product
curl -X GET "http://localhost:3001/admin/batches?productId=12345-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Commit:**
```bash
git commit -m "feat(batch): add batch tracking module with admin CRUD"
```

**Learning Outcome:**
- ✅ Generate and structure a full NestJS module
- ✅ Use DTOs for input validation
- ✅ Guard routes with roles (`@Roles`, `@UseGuards`)

---

### Phase 3.3: Inventory Service (Atomic Transactions)

**Learning Goal:** Use Prisma transactions for atomic operations.

**Background:**

Atomic = all-or-nothing. If reserving inventory fails halfway, don't leave the database in an inconsistent state.

```typescript
// ❌ BAD: Not atomic
const inventory = await prisma.inventory.findUnique(...);
if (inventory.onHand < qty) throw new Error('Not enough');
await prisma.inventory.update({  // Crash here → middle state ❌
  data: { onHand: { decrement: qty } }
});

// ✅ GOOD: Atomic transaction
await prisma.$transaction([
  prisma.inventory.update({
    where: { batchId },
    data: { reserved: { increment: qty } },
  }),
  prisma.reservationLog.create({
    data: { batchId, qty, reason: 'order-123' },
  }),
]);
// Either both succeed or both rollback ✅
```

**Branch:** `feat/inventory-service`

**Steps:**

1. Create `apps/api/src/inventory/inventory.service.ts`:
   ```typescript
   import { Injectable, BadRequestException } from '@nestjs/common';
   import { PrismaService } from 'src/prisma/prisma.service';

   @Injectable()
   export class InventoryService {
     constructor(private prisma: PrismaService) {}

     /**
      * Reserve inventory atomically.
      * Throws if quantity exceeds available stock.
      */
     async reserveInventory(batchId: string, quantity: number) {
       return await this.prisma.$transaction(async (tx) => {
         // Fetch current inventory (row lock in transaction)
         const inventory = await tx.inventory.findUniqueOrThrow({
           where: { batchId },
         });

         // Check if enough available
         const available = inventory.onHand - inventory.reserved;
         if (available < quantity) {
           throw new BadRequestException(
             `Cannot reserve ${quantity}. Only ${available} available.`,
           );
         }

         // Reserve (atomic within transaction)
         await tx.inventory.update({
           where: { batchId },
           data: { reserved: { increment: quantity } },
         });

         // Log the reservation
         return tx.inventoryLog.create({
           data: {
             batchId,
             quantity,
             action: 'RESERVE',
             timestamp: new Date(),
           },
         });
       });
     }

     /**
      * Release reserved inventory atomically.
      */
     async releaseInventory(batchId: string, quantity: number) {
       return await this.prisma.$transaction(async (tx) => {
         const inventory = await tx.inventory.findUniqueOrThrow({
           where: { batchId },
         });

         if (inventory.reserved < quantity) {
           throw new BadRequestException(
             `Cannot release ${quantity}. Only ${inventory.reserved} reserved.`,
           );
         }

         await tx.inventory.update({
           where: { batchId },
           data: { reserved: { decrement: quantity } },
         });

         return tx.inventoryLog.create({
           data: {
             batchId,
             quantity,
             action: 'RELEASE',
             timestamp: new Date(),
           },
         });
       });
     }

     /**
      * Adjust inventory (add/remove stock).
      */
     async adjustInventory(
       batchId: string,
       quantity: number,
       reason: string,
     ) {
       return await this.prisma.$transaction(async (tx) => {
         await tx.inventory.update({
           where: { batchId },
           data: { onHand: { increment: quantity } },
         });

         return tx.inventoryLog.create({
           data: {
             batchId,
             quantity,
             action: 'ADJUST',
             reason,
             timestamp: new Date(),
           },
         });
       });
     }
   }
   ```

2. Create `apps/api/src/inventory/inventory.service.spec.ts`:
   ```typescript
   import { Test } from '@nestjs/testing';
   import { BadRequestException } from '@nestjs/common';
   import { InventoryService } from './inventory.service';
   import { PrismaService } from 'src/prisma/prisma.service';

   describe('InventoryService', () => {
     let service: InventoryService;
     let prisma: PrismaService;

     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [
           InventoryService,
           {
             provide: PrismaService,
             useValue: {
               $transaction: jest.fn(),
               inventory: {
                 findUniqueOrThrow: jest.fn(),
                 update: jest.fn(),
               },
               inventoryLog: {
                 create: jest.fn(),
               },
             },
           },
         ],
       }).compile();

       service = module.get(InventoryService);
       prisma = module.get(PrismaService);
     });

     it('should reserve inventory successfully', async () => {
       const mockTx = {
         inventory: {
           findUniqueOrThrow: jest.fn().mockResolvedValue({
             batchId: '123',
             onHand: 100,
             reserved: 0,
           }),
           update: jest.fn(),
         },
         inventoryLog: {
           create: jest.fn().mockResolvedValue({ id: 'log-1' }),
         },
       };

       (prisma.$transaction as jest.Mock).mockImplementation((fn) =>
         fn(mockTx),
       );

       const result = await service.reserveInventory('123', 50);

       expect(mockTx.inventory.update).toHaveBeenCalledWith({
         where: { batchId: '123' },
         data: { reserved: { increment: 50 } },
       });
       expect(result).toEqual({ id: 'log-1' });
     });

     it('should throw when reserving more than available', async () => {
       const mockTx = {
         inventory: {
           findUniqueOrThrow: jest.fn().mockResolvedValue({
             batchId: '123',
             onHand: 100,
             reserved: 60,  // Only 40 available
           }),
         },
       };

       (prisma.$transaction as jest.Mock).mockImplementation((fn) =>
         fn(mockTx),
       );

       await expect(service.reserveInventory('123', 50)).rejects.toThrow(
         BadRequestException,
       );
     });
   });
   ```

3. Create module `apps/api/src/inventory/inventory.module.ts`:
   ```typescript
   import { Module } from '@nestjs/common';
   import { InventoryService } from './inventory.service';

   @Module({
     providers: [InventoryService],
     exports: [InventoryService],
   })
   export class InventoryModule {}
   ```

4. In `app.module.ts`, add `InventoryModule` to imports.

**Commit:**
```bash
git commit -m "feat(inventory): implement atomic inventory reservations with transactions"
```

**Learning Outcome:**
- ✅ Use `prisma.$transaction()` for all-or-nothing operations
- ✅ Prevent race conditions (row-level locks)
- ✅ Test transactions using mocks

📚 **External Resources:**
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)

---

## Phase 4: Public API & Audit Trail (PREVIEW)

**Tools & Infrastructure:**
- **HTTP Testing:** Thunder Client, Postman (test public endpoints)
- **Logging:** Winston (structured logging)
- **Monitoring:** Sentry (error tracking)
- **Database:** Audit table + indexes

**Audit Logging Tools:**
```bash
# Track all database changes
docker exec postgres pg_dump coffee_logic > backup.sql

# Query audit logs
psql -c "SELECT * FROM AuditEvent ORDER BY timestamp DESC LIMIT 100;"
```

**GitHub Actions: Security Scanning (Phase 4+):**
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Dependency scanning
      - name: Audit dependencies
        run: npm audit --production

      # SAST scanning
      - name: Run SonarQube
        uses: SonarSource/sonarcloud-github-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Secret scanning
      - name: Detect secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
```

---

### Phase 4.1: Storefront API (Public, No Auth)

**Steps:** Create `/storefront/products` endpoint returning only active products with peak freshness status. Strip internal fields from response.

### Phase 4.2: Audit Logging

**Steps:** Log all mutations (create/update/delete) with actor ID, timestamp, change details.

**Logging Tool Example:**
```typescript
import * as winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage in audit service
logger.info('User created', {
  actorId: req.user.id,
  targetId: newUser.id,
  timestamp: new Date().toISOString(),
});
```

### Phase 4.3: Consolidate Product Module

**Steps:** Merge duplicate product module structures.

---

## Phase 5: Frontend & Checkout (PREVIEW)

**Tools & Infrastructure:**
- **Redis** — Job queue (BullMQ), caching
- **BullMQ** — Background job processing
- **Stripe CLI** — Local webhook testing
- **Sentry** — Error tracking (frontend)
- **Lighthouse** — Performance testing
- **Artillery** — Load testing

**Infrastructure Upgrade (Phase 5):**
```yaml
# docker-compose.extended.yml - Add job queue
version: '3.8'

services:
  bullboard:
    image: felixmosh/bull-board:latest
    ports:
      - '3001'
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis
```

Access job queue UI: `http://localhost:3001/admin`

**Load Testing Prepare (Phase 5):**
```bash
# Artillery config for load testing checkout
# artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Ramp up'

scenarios:
  - name: 'Checkout flow'
    flow:
      - post:
          url: '/checkout/create-session'
          json: { items: [{productId: '123', qty: 2}] }
      - think: 5
      - get:
          url: '/checkout/session/{{ sessionId }}'
```

Run: `artillery run artillery.yml`

### Phase 5.1: Frontend Resilience

Error boundaries, skeleton loaders, graceful degradation.

**Sentry Setup (Phase 5):**
```bash
npm install @sentry/react @sentry/tracing

# Initialize in React app
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Phase 5.2: Stripe Checkout

Webhook verification, idempotency, order creation on payment success.

**Stripe Webhook Testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3001/checkout/webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

## Phase 6: Testing & CI/CD (PREVIEW)

**Tools & Infrastructure:**
- **Jest** — Unit testing
- **Supertest** — E2E testing
- **k6/Artillery** — Load testing
- **GitHub Actions** — CI/CD pipeline
- **Codecov** — Coverage reporting
- **SonarQube** — Code quality scanning
- **Helmet.js** — Security headers
- **Docker** — Containerization

**CI/CD Pipeline Files (Phase 6+):**
```bash
# scripts/ci.sh - Continuous integration script
#!/bin/bash
set -e

echo "🔄 Running CI pipeline..."

echo "📍 Step 1: Lint"
pnpm -C apps/api lint

echo "🧪 Step 2: Unit tests"
pnpm -C apps/api test --coverage

echo "🌐 Step 3: Build"
pnpm -C apps/api build

echo "📊 Step 4: Upload coverage"
curl -Os https://uploader.codecov.io/latest/linux/codecov
chmod +x codecov
./codecov -t $CODECOV_TOKEN

echo "✅ CI pipeline passed!"
```

### Phase 6.1: Auth E2E Tests

**E2E Testing Framework:**
```typescript
// test/auth.e2e.spec.ts - Integration tests
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (E2E)', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrong' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid');
        });
    });

    it('should return 429 after 5 requests', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
          .expect(401);
      }

      // 6th request should be rate limited
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(429);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Phase 6.2: Unit Tests & Coverage

Run: `pnpm -C apps/api test --coverage`

**Coverage Requirements:**
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

### Phase 6.3: Security & Production CI (Phase 6+)

**Complete GitHub Actions Workflow:**
```yaml
# .github/workflows/main.yml
name: Full CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/api

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install && pnpm -C apps/api lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm -C apps/api test --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@postgres:5432/test
          REDIS_URL: redis://redis:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/coverage-final.json

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --production

      - name: Run SonarQube
        uses: SonarSource/sonarcloud-github-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build:
    needs: [lint, test, security]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

**Dockerfile (Phase 6):**
```dockerfile
# apps/api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm -C apps/api build

# Runtime stage
FROM node:18-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy package.json + lockfile
COPY --from=builder app/package.json app/pnpm-lock.yaml ./
COPY --from=builder app/apps/api/dist ./dist
COPY --from=builder app/apps/api/package.json ./

# Install production deps only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
```

**Security Headers (Phase 6+):**
```bash
pnpm -C apps/api add helmet

# In main.ts
import helmet from '@nestjs/helmet';

app.use(helmet());
```

---

## Phase 7: Ship (Production Deployment)

**Tools & Infrastructure:**
- **Railway** or **Render** — Deploy Node.js app
- **Supabase** or **AWS RDS** — Managed PostgreSQL
- **Vercel** — Deploy React frontend
- **Cloudflare** — CDN + DDoS protection + SSL
- **AWS Route53** or **Namecheap** — DNS
- **Datadog** or **New Relic** — Production monitoring
- **PagerDuty** — On-call alerts
- **GitHub Deployments** — Track releases

**Production Deployment Architecture:**
```
┌─────────────────┐
│ GitHub Actions  │
│ (CI/CD)         │
└────────┬────────┘
         │ On push to main
         ↓
┌─────────────────────────────┐
│ 1. Build Docker image       │
│ 2. Push to registry         │
│ 3. Deploy to Railway        │
└────────┬────────────────────┘
         ↓
┌─────────────────────────────┐
│ Railway (Compute)           │
│ - Auto scaling              │
│ - Health checks             │
│ - Logs aggregation          │
└────────┬────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Cloudflare│ │Supabase│ │ Stripe │ │SendGrid│
│(CDN)    │ │(DB+Auth) │ │Webhooks│ │ Email  │
└─────────┘ └────────┘ └────────┘ └────────┘
     ↑
     │
  Datadog (Monitoring & Logging)
```

**Deploy Script (Phase 7):**
```bash
#!/bin/bash
# scripts/deploy.sh - Production deployment

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Deploying Coffee Logic to $ENVIRONMENT..."

# 1. Verify tests pass
echo "🧪 Running tests..."
pnpm -C apps/api test --passWithNoTests
pnpm -C apps/web test -- --passWithNoTests

# 2. Build artifacts
echo "🏗️  Building..."
pnpm -C apps/api build
pnpm -C apps/web build

# 3. Database migrations
echo "🔄 Running migrations..."
pnpm -C apps/api prisma migrate deploy

# 4. Docker build
echo "🐳 Building Docker image..."
docker build \
  -f apps/api/Dockerfile \
  -t coffee-api:$ENVIRONMENT \
  .

# 5. Push to registry
echo "📦 Pushing to registry..."
docker tag coffee-api:$ENVIRONMENT ghcr.io/username/coffee-api:$ENVIRONMENT
docker push ghcr.io/username/coffee-api:$ENVIRONMENT

# 6. Deploy API
echo "🌐 Deploying API..."
SSH_KEY=$DEPLOY_SSH_KEY railway deploy --environment=$ENVIRONMENT

# 7. Deploy Web
echo "🎨 Deploying Web..."
vercel --prod

# 8. Run smoke tests
echo "🔍 Running smoke tests..."
npm run test:smoke -- --url https://api-$ENVIRONMENT.coffeelogic.com

echo "✅ Deployment complete!"
echo "📊 Monitoring: https://datadog.com/dashboard"
```

## Phase 7.1: Documentation & Runbook

**Files to Create:**
```
docs/
├── DEPLOYMENT.md      # Step-by-step deployment guide
├── RUNBOOK.md         # Incident response procedures
├── API.md             # API documentation (OpenAPI)
├── ARCHITECTURE.md    # System design overview
└── DECISIONS/         # Architecture Decision Records (ADRs)
    ├── ADR-001-jwt-over-sessions.md
    ├── ADR-002-serverless-vs-containers.md
    └── ADR-003-redis-for-rate-limiting.md
```

**Deployment Documentation Template:**
```markdown
# Deployment Runbook

## Prerequisites
- [ ] All tests passing
- [ ] Database backups created
- [ ] Deployment window scheduled
- [ ] On-call engineer notified

## Deployment Steps
1. Pull latest `main` branch
2. Run `scripts/deploy.sh production`
3. Verify health endpoint: `curl https://api.coffeelogic.com/health`
4. Run smoke tests
5. Monitor Datadog for 10 minutes

## Rollback Procedure
If issues detected:
1. `railway rollback --environment=production`
2. Verify: `curl https://api.coffeelogic.com/health`
3. Notify team in #incidents channel

## Post-Deployment
- [ ] Update VERSION file
- [ ] Tag git commit: `git tag v1.2.3 && git push --tags`
- [ ] Create GitHub Release
- [ ] Update status page
```

## Phase 7.2: Deploy to Production

**Railway Deployment:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway link  # Link to existing project
railway deploy

# View logs
railway logs
railway logs --tail  # Real-time
```

**SSL/TLS Setup (Cloudflare):**
1. Add domain to Cloudflare
2. Update DNS: Route53 → Cloudflare nameservers
3. In Railway settings: Enable custom domain
4. SSL: Automatic via Cloudflare

**Environment Variables (Production):**
```bash
# Railway dashboard → variables
NODE_ENV=production
JWT_SECRET=<64 chars random>
DATABASE_URL=postgresql://...?sslmode=require
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
SENTRY_DSN=https://...
```

**Health Check Endpoint (Phase 7):**
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || '1.0.0',
    };
  }
}
```

**Post-Deployment Verification:**
```bash
# Check API
curl https://api.coffeelogic.com/health

# Check database
curl -X GET https://api.coffeelogic.com/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check logs
railway logs --tail

# Performance check (Lighthouse)
lighthouse https://web.coffeelogic.com

# Load test (5 min @ 100 req/s)
artillery run artillery-check.yml
```

---

## Production Deployment Checklist

**Code Quality:**
- [ ] All tests passing (100% on critical paths)
- [ ] No console.log in production code
- [ ] No hardcoded secrets
- [ ] ESLint/Prettier passing
- [ ] SonarQube passing quality gate
- [ ] Dependencies audited (`npm audit`)

**Security:**
- [ ] JWT_SECRET is 64+ random characters (not "Secret_JWT")
- [ ] DATABASE_URL uses SSL connection (`?sslmode=require`)
- [ ] CORS restricted to your domain only
- [ ] Helmet.js security headers enabled
- [ ] Rate limiting uses Redis (not in-memory)
- [ ] All endpoints authenticated except `/health`, `/api/storefront/*`
- [ ] No API keys committed to git
- [ ] Secrets in environment variables or secret manager
- [ ] Request signing for webhooks (Stripe signature verification)
- [ ] SQL injection prevented (via Prisma parameterized queries)

**Infrastructure:**
- [ ] Logs sent to central service (Datadog, not stdout)
- [ ] Database backups automated (daily, tested)
- [ ] API behind CDN/reverse proxy (SSL termination)
- [ ] Health check endpoint (`GET /health`) responds <500ms
- [ ] Database query logging disabled (performance)
- [ ] Rate limiting per user (not just  IP)
- [ ] Refresh token + revocation mechanism
- [ ] Email verification for new users
- [ ] Monitoring & alerts configured
- [ ] On-call rotation setup

**Performance:**
- [ ] API response time <200ms (p99)
- [ ] Database queries indexed appropriately
- [ ] No N+1 queries (verified with profiler)
- [ ] Caching strategy for expensive queries
- [ ] CDN configured for static assets
- [ ] Compression enabled (gzip)

**Operations:**
- [ ] Deployment documented in RUNBOOK.md
- [ ] Rollback procedure tested
- [ ] Incident response plan
- [ ] Post-deployment smoke tests passing
- [ ] Version tracking (`VERSION` file)
- [ ] Git tags for releases
- [ ] Release notes updated

---

## Common Production Issues & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 500 on all routes | Database unreachable | Check `DATABASE_URL`, verify database is running |
| "too many connections" | Multiple PrismaService instances | Verify `@Global() PrismaModule` (Phase 1.2) |
| Tokens can be forged | JWT_SECRET undefined | Verify Zod validation crashes on startup if missing |
| Rate limiting not working | Not using ThrottlerGuard | Check `@UseGuards(ThrottlerGuard)` on route |
| Slow queries | Missing indexes | Check database logs, add `@db.Index` to schema |
| Memory leak | Old rate-limit entries never cleaned | Upgrade to Redis (Phase 5+) |

---

## Security Best Practices Applied

| OWASP | Your Defense |
|---|---|
| A01: Broken Access Control | JWT + Roles + Guards + row-level filters |
| A02: Cryptographic Failures | JWT_SECRET validated ≥32 chars, HTTPS enforced |
| A03: Injection | Prisma parameterized queries, no string concatenation |
| A04: Insecure Design | Phase-by-phase security (not bolted on later) |
| A05: Broken Authentication | Rate limiting, password hashing, account lockout (future) |
| A06: Sensitive Data Exposure | No passwords in logs, secrets in env vars, HTTPS only |
| A07: Identification & Auth Failure | Zod env validation, exception filters for errors |
| A08: Software & Data Integrity | Semantic versioning, dependency scanning |
| A09: Logging & Monitoring | Structured logging, audit trail (Phase 4) |
| A10: SSRF | No user input in HTTP requests |

---

## Learning Progression

**Level 1: Foundations**
- [ ] Understand NestJS pipeline (middleware → guard → pipe → controller → filter)
- [ ] Write DTOs with validation
- [ ] Use Prisma ORM for queries

**Level 2: Architecture**
- [ ] Design modules (separation of concerns)
- [ ] Write exception filters (error handling)
- [ ] Use dependency injection (`@Inject`, `registerAsync`)

**Level 3: Production Ready**
- [ ] Implement transactions (atomicity)
- [ ] Write tests (unit + E2E)
- [ ] Set up CI/CD pipeline

**Level 4: Advanced**
- [ ] Design new features end-to-end
- [ ] Optimize database queries (N+1, indexes)
- [ ] Implement caching & job queues

---

## Resources Summary

### Essential Documentation
- [NestJS Official Docs](https://docs.nestjs.com) — Framework guide
- [Prisma Docs](https://www.prisma.io/docs) — ORM reference
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Language guide
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) — Database reference
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Security  essentials
- [12 Factor App](https://12factor.net) — Application design principles

### Video Courses
- [freeCodeCamp: NestJS Course (32hr)](https://www.youtube.com/watch?v=32o_oHcLn-E)
- [NestJS Official Courses](https://learn.nestjs.com)
- [Jake Archibald: In The Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0) — Event loop visualization

### Development Tools
- [Prisma Studio](https://www.prisma.io/studio) — Visual database browser
- [Thunder Client](https://www.thunderclient.com) — VS Code REST client
- [Insomnia](https://insomnia.rest) — API testing platform
- [Postman](https://www.postman.com) — Advanced API testing
- [DBeaver](https://dbeaver.io) — Universal database tool

### Production Services

**Compute & Hosting:**
- [Railway.app](https://railway.app) — Node.js hosting (recommended, easiest)
- [Render.com](https://render.com) — Alternative to Railway
- [Vercel](https://vercel.com) — Frontend hosting
- [AWS](https://aws.amazon.com) — Enterprise-grade (more complex)

**Database:**
- [Supabase](https://supabase.com) — PostgreSQL + Auth
- [AWS RDS](https://aws.amazon.com/rds/) — Managed PostgreSQL
- [PlanetScale](https://planetscale.com) — MySQL alternative

**CDN & Security:**
- [Cloudflare](https://cloudflare.com) — CDN + DDoS + SSL (recommended)
- [AWS CloudFront](https://aws.amazon.com/cloudfront/) — AWS CDN

**Monitoring:**
- [Datadog](https://www.datadoghq.com) — All-in-one monitoring
- [New Relic](https://newrelic.com) — APM + monitoring
- [Sentry](https://sentry.io) — Error tracking (free tier available)
- [Prometheus](https://prometheus.io) + [Grafana](https://grafana.com) — Open-source metrics

**Incident Management:**
- [PagerDuty](https://www.pagerduty.com) — On-call scheduling
- [Opsgenie](https://www.atlassian.com/software/opsgenie) — Alert management
- [Slack](https://slack.com) — Notifications

**Secrets Management:**
- [Vault](https://www.vaultproject.io) — HashiCorp secret management
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Doppler](https://www.doppler.com) — Secret management SaaS

### Learning Paths

**Foundation (Week 1):**
- [ ] TypeScript basics + types
- [ ] NestJS request pipeline
- [ ] Prisma model relationships
- [ ] Docker Compose setup

**Development (Weeks 2-4):**
- [ ] Build Phase 1-3 (config, security, inventory)
- [ ] Write unit tests
- [ ] Create GitHub Actions pipeline
- [ ] Deploy to staging

**Production (Weeks 5-6):**
- [ ] Implement authentication
- [ ] Add monitoring & alerts
- [ ] Build CI/CD fully
- [ ] Deploy to production
- [ ] Incident response training

### Recommended Reading Order

1. **Monday:** Read "The NestJS Request Pipeline" section (memorize it)
2. **Tuesday:** Read "TypeScript vs Java" + "Node.js: One Thread" sections
3. **Wednesday:** Read "Production Deployment Architecture" diagram
4. **Thursday-Friday:** Start Phase 1.1 implementation

---

---

## Production Operations: Tools & Technologies Stack

### Monitoring & Observability (Phase 5+)

**Option 1: Datadog (Recommended for startups)**
```bash
# Install Datadog agent
npm install dd-trace

# Initialize in main.ts
import tracer from 'dd-trace';
tracer.init();

# Captures: APM, Logs, Metrics, User sessions
```

**Option 2: Self-Hosted Stack (Cost-effective)**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  prometheus:  # Metrics collection
    image: prom/prometheus:latest
    ports: ['9090:9090']

  grafana:  # Metrics visualization
    image: grafana/grafana:latest
    ports: ['3000:3000']

  elasticsearch:  # Log storage
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0

  kibana:  # Log visualization
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports: ['5601:5601']

  logstash:  # Log processing
    image: docker.elastic.co/logstash/logstash:8.0.0
```

**Option 3: Cloud-Native (AWS CloudWatch)**
```bash
# Integrated with AWS services
# CloudWatch Logs → CloudWatch Metrics → CloudWatch Dashboards
# Automatic with Railway/AWS deployment
```

### Incident Management (Phase 6+)

| Tool | Purpose | Cost | Setup Time |
|---|---|---|---|
| **PagerDuty** | On-call management + alerts | $50/month | 1 hour |
| **Opsgenie** | Alert aggregation | $30/month | 30 min |
| **VictorOps** | On-call scheduling | $39/month | 45 min |
| **Slack** | Incident notifications | Free | 5 min |

**Slack + PagerDuty Integration:**
```yaml
# .env.production
PAGERDUTY_INTEGRATION_KEY=...
SLACK_WEBHOOK_URL=...

# Workflow: Alert → PagerDuty → Page On-Call → Slack Notification
```

### Database Management (Production)

| Tool | Purpose | Cost | When |
|---|---|---|---|
| **Supabase** | PostgreSQL + Auth + Realtime | From $25/month | Best for startups |
| **AWS RDS** | Managed PostgreSQL | From $30/month | Enterprise scale |
| **DigitalOcean Managed DB** | PostgreSQL + Backups | From $15/month | Balanced |
| **PgBouncer** | Connection pooling | Free (self-hosted) | >100 connections |

**Backup & Recovery (Phase 7):**
```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL > /backups/db-$(date +\%Y\%m\%d).sql

# Test restore monthly
pg_restore /backups/db-latest.sql -d coffee_logic_test

# Verify integrity
SELECT COUNT(*) FROM User;  # Should match expected count
```

### Content Delivery Network (CDN)

| Tool | Features | Cost | Best For |
|---|---|---|---|
| **Cloudflare** | CDN + DDoS + Caching | Free tier + $20/month | Default choice |
| **AWS CloudFront** | CDN + Lambda@Edge | Pay-per-use | AWS ecosystem |
| **Bunny CDN** | Cheap, fast | $0.01/GB | Budget |
| **Fastly** | High performance computing | $50+/month | Streaming |

**Cloudflare Setup (5 min):**
1. Add domain to Cloudflare
2. Change DNS nameservers at registrar
3. Page Rules: Cache Everything (`/api/storefront/*`)
4. Security: Rate Limiting (20 req/min anonymous)

### Database Query Optimization

**Monitoring Slow Queries:**
```sql
-- Enable slow query log (PostgreSQL)
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT query, mean_time, calls FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Create indexes
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_batch_roastdate ON "Batch"("roastDate");
CREATE INDEX idx_inventory_available ON "Inventory"("onHand" - "reserved");
```

### Load Balancing & Redundancy (Scale-Up)

```nginx
# Nginx config for multiple API instances
upstream coffee_api {
  least_conn;  # Distribute by fewest connections

  server api1.internal:3001 weight=3;
  server api2.internal:3001 weight=2;
  server api3.internal:3001 weight=1;

  keepalive 32;
}

server {
  listen 80;
  server_name api.coffeelogic.com;

  location / {
    proxy_pass http://coffee_api;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Health check
  location /health {
    access_log off;
    proxy_pass http://coffee_api/health;
    proxy_connect_timeout 5s;
    proxy_read_timeout 5s;
  }
}
```

### Secrets Management (Production)

| Tool | Cost | Security | Ease |
|---|---|---|---|
| **Vault** (HashiCorp) | Free + hosted | Excellent | Complex |
| **AWS Secrets Manager** | $0.40/secret | Excellent | Easy |
| **GitHub Secrets** | Free | Good | Very Easy |
| **Doppler** | Free tier + $7/month | Excellent | Easy |

**Using GitHub Secrets:**
```yaml
# .github/workflows/deploy.yml
- name: Deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  run: railway deploy
```

### Logging Strategy (Production)

```typescript
// winston.config.ts - Structured logging
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'coffee-api',
    version: process.env.VERSION,
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console (development)
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console()]
      : []),

    // File (all levels)
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,  // 10MB
      maxFiles: 5,
    }),

    // Errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
  ],
});

// Don't log sensitive data
logger.info('User created', {
  userId: user.id,  // ✅ OK
  email: maskEmail(user.email),  // ✅ Masked
  // database_url: process.env.DATABASE_URL  // ❌ NEVER!
});
```

### Complete Production Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    COFFEE LOGIC PRODUCTION                      │
├─────────────────────────────────────────────────────────────────┤
│ FRONTEND                                                        │
│  • Vercel (hosting) + GitHub Actions (CI)                      │
│  • React + TypeScript + ESLint/Prettier                        │
│  • Sentry (error tracking)                                     │
├─────────────────────────────────────────────────────────────────┤
│ NETWORKING                                                      │
│  • Cloudflare (CDN, DDoS, SSL)                                 │
│  • Route53 / Namecheap (DNS)                                   │
│  • Nginx (load balancer)                                       │
├─────────────────────────────────────────────────────────────────┤
│ COMPUTE                                                         │
│  • Railway / Render (deployment)                               │
│  • Docker (containers)                                         │
│  • Node.js 18+ (runtime)                                       │
├─────────────────────────────────────────────────────────────────┤
│ DATA LAYER                                                      │
│  • Supabase (PostgreSQL) + PgBouncer (connection pooling)      │
│  • Redis (caching, rate limiting, job queue)                  │
├─────────────────────────────────────────────────────────────────┤
│ BACKGROUND JOBS                                                 │
│  • BullMQ (job queue library)                                  │
│  • Redis (job storage)                                         │
│  • Workers (background processing)                             │
├─────────────────────────────────────────────────────────────────┤
│ MONITORING & OBSERVABILITY                                     │
│  • Datadog OR ELK Stack (logs & metrics)                       │
│  • Prometheus + Grafana (alternative)                          │
│  • Sentry (error tracking)                                     │
│  • PagerDuty + Slack (incidents)                               │
├─────────────────────────────────────────────────────────────────┤
│ SECURITY & COMPLIANCE                                           │
│  • Vault / AWS Secrets Manager (secrets)                       │
│  • SonarQube (code security)                                   │
│  • Snyk (dependency scanning)                                  │
│  • SSL/TLS (Cloudflare)                                        │
├─────────────────────────────────────────────────────────────────┤
│ CI/CD                                                           │
│  • GitHub Actions (workflows)                                  │
│  • Codecov (coverage reporting)                                │
│  • Dependabot (dependency updates)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

**You are at Phase 3.1 ✅**

Your next tasks:
1. Verify Phase 3.1 tests pass: `pnpm -C apps/api test -- freshness.util.spec.ts`
2. Start Phase 3.2: Generate Batch module
3. Commit both with appropriate messages

**When you're ready, say "Ready for Phase 3.2" and I'll provide detailed implementation steps.**

---

**Document maintained up to Phase 3.1. Start here. Build it. Ship it. 🚀**
