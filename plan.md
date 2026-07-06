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

### Deep Dives: How Each Tool Works (The Internals)

> Understanding tool internals prevents you from misusing them. For example, knowing Redis is single-threaded explains why slow commands block all clients.

#### Docker: Layered Images & Container Isolation

**What it does:** Packages code + dependencies into a container that works identically everywhere.

**How it works internally:**
```
Dockerfile:
FROM node:18-alpine          # Base layer (150MB)
  │
  ├─→ Layer 1: Alpine Linux filesystem
  │
COPY package.json .          # New layer (2KB)
  │
  └─→ Layer 2: Your files

RUN npm install              # New layer (500MB) — cached!
  │
  └─→ Layer 3: node_modules

COPY src/ src/               # New layer (100KB)
  │
  └─→ Layer 4: Your source code
```

**Key insight:** Each command creates a layer. Docker caches layers. So:
```dockerfile
# ✅ GOOD: Files change often, dependencies rarely
COPY package.json .
RUN npm install
COPY src/ src/

# ❌ BAD: Re-installs npm every build if package.json OR src/ changes
COPY . .
RUN npm install
```

**Common failure modes:**
- **"It works in my Docker but not production":** Different Node version in base image
- **"Docker build is slow":** Missing .dockerignore, copying node_modules
- **"Container exits immediately":** Entrypoint crashed (check logs: `docker logs <id>`)

**Production pattern:** Multi-stage builds reduce final image size:
```dockerfile
# Stage 1: Build
FROM node:18 as builder
COPY . .
RUN npm install && npm run build   # Runs tsc, produces /dist

# Stage 2: Runtime (doesn't include dev dependencies)
FROM node:18-alpine
COPY --from=builder /dist /dist
COPY --from=builder /node_modules /node_modules
CMD ["node", "dist/main.js"]
# Final image: 200MB instead of 1GB
```

#### Redis: Single-Threaded Event Loop (Like Node!)

**What it does:** In-memory key-value store. Extremely fast because data lives in RAM.

**How it works internally:**
```
┌─────────────────────────────────┐
│ Redis Server (single thread)    │
│ Processes commands one at a time│
└────────┬────────────────────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
Client 1  Client 2  Client 3  Client 4
GET key   SET key   LPUSH     HGETALL
(10μs)    (15μs)    (5μs)     (100μs)

While Client 4 runs (100μs), Clients 1-3 WAIT
```

**Key insight:** Redis is single-threaded like Node. Long operations block everything.

**Common failure modes:**
- **"Redis is slow":** You sent a command like `KEYS *` on 10 million keys (takes seconds)
- **"Sessions keep disappearing":** TTL expired or memory limit reached (Redis evicts old keys)
- **"Can't connect to Redis":** Port 6379 not exposed or firewall blocking

**Production pattern:** Use key prefixes and expiration:
```typescript
// ✅ GOOD: Prefixed keys + TTL
await redis.set(`cache:products:${productId}`, JSON.stringify(product), 'EX', 3600);
// Deletes automatically after 1 hour

// ❌ BAD: No expiration = memory leak
await redis.set(`cache:products:${productId}`, JSON.stringify(product));
// Memory grows forever
```

#### PostgreSQL: ACID Guarantees

**What it does:** Relational database with strong consistency guarantees.

**How it works internally:**
```
INSERT INTO orders VALUES (...)
  ↓
1. Write to WAL (Write-Ahead Log) on disk ← Ensures durability
  ↓
2. Update in-memory buffer pool
  ↓
3. Return success to client
  ↓
(Background: Checkpoint process periodically flushes to disk)

If server crashes after step 3 but before checkpoint:
→ Replay WAL on restart → Data recovers
```

**ACID guarantees:**
- **Atomicity:** Transaction succeeds completely or rolls back (no partial updates)
- **Consistency:** Data follows rules (unique constraints, foreign keys)
- **Isolation:** Concurrent transactions don't interfere
- **Durability:** Data survives server crash

**Common failure modes:**
- **"Too many connections":** Connection pool limit reached (default 100)
- **"Query timeout":** Complex query scanning 10M rows
- **"Deadlock detected":** Two transactions fighting over same row (rare, app retry)

**Production pattern:** Connection pooling + PgBouncer
```
App instances (10) → PgBouncer (connection multiplexer) → PostgreSQL (1 server)

Without PgBouncer:
10 instances × 20 connections = 200 connections to DB

With PgBouncer:
10 instances → PgBouncer pool 50 → 10 actual DB connections
PgBouncer reuses connections, multiplexes efficiently
```

#### Nginx: Reverse Proxy & Load Balancing

**What it does:** Sits between client and backend servers. Distributes traffic.

**How it works internally:**
```
Client Request arrives
  ↓
1. Parse HTTP (extract method, headers, path)
  ↓
2. Decide (based on upstream config) which backend to route to
  ↓
3. Forward request to backend
  ↓
4. Wait for backend response
  ↓
5. Add headers (X-Real-IP for logging)
  ↓
6. Send back to client

All while handling 10,000 concurrent connections
(Event loop like Node, uses epoll on Linux)
```

**Load balancing strategies:**
```
Round-robin (default):     Request 1→A, 2→B, 3→C, 4→A
Least connections:          Route to server with fewest open connections
Weighted:                   Route 50% to A, 30% to B, 20% to C
Hash:                       Route same IP always to same server (sticky)
```

**Common failure modes:**
- **"502 Bad Gateway":** Backend server down (Nginx tried to route, backend refused/offline)
- **"Upstream timed out":** Backend taking >30 seconds (default timeout)
- **"Connection refused":** Nginx misconfigured, pointing to wrong port/IP

**Production pattern:** Health checks + failover
```nginx
upstream backend {
  server backend1.example.com:3001;
  server backend2.example.com:3001;
  server backend3.example.com:3001;
}

server {
  location / {
    proxy_pass http://backend;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
  }
}
```

#### GitHub Actions: CI/CD Pipeline Automation

**What it does:** Runs tests and deploys code automatically when you push.

**How it works internally:**
```
You: git push                 → Trigger
  ↓
GitHub: Webhook to Actions
  ↓
Spin up VM (Ubuntu, Windows, macOS)
  ↓
1. checkout code
2. setup Node.js 18
3. npm install
4. npm run test
5. if test passes: npm run build && deploy
6. if test fails: stop, show error
  ↓
Return result → Show checkmark or ❌ on PR
```

**Common failure modes:**
- **"Action fails but works locally":** Different Node version in CI vs local
- **"Too many workflows running":** GitHub Actions queue (free tier: 20 concurrent)
- **"Secrets exposed in logs":** Accidentally logged `process.env.DATABASE_URL`

**Production pattern:** Matrix strategy (test multiple Node versions)
```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
# Runs test on all 3 versions, catches compatibility issues
```

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

---

## TypeScript Deep Dive: The System Backbone

> TypeScript IS the language of this project. Understanding it deeply is non-negotiable for production work.

### What is TypeScript? (Definition & Philosophy)

TypeScript is a **superset of JavaScript** that adds a static type system compiled into JavaScript. Think of it like:
- **JavaScript:** Unfenced open-field (any value can go anywhere)
- **TypeScript:** Fenced farm (fields have specific purposes, compiles to JavaScript fence removal)

**Core definition:**
```
TypeScript = JavaScript + Type System + Compilation
              ↓              ↓                ↓
          (all JS valid)  (catches errors)  (outputs JS)
```

### Why TypeScript in This Project? (Problem Solving)

| Problem | Without TypeScript ❌ | With TypeScript ✅ |
|---------|-------------------|-------------------|
| Passing wrong type to function | Fails at runtime after deployed | Fails immediately in editor |
| Refactoring database field | Change field, miss 47 usages, production breaks | IDE highlights all 47 usages before deploy |
| API response shape changes | API returns `{ user: { name, email } }` but code expects `{ user: { name, id } }` → TypeError at 3 AM | IDE catches shape mismatch before deploy |
| Onboarding new developer | "What does this function accept?" → read source code | Hover over function → see type signature + docs |
| Legacy code maintenance | Debugging mutations, understanding function contracts | Types are machine-readable contracts |

### How TypeScript Works (The Pipeline)

```
┌─────────────────────────────────────┐
│ TypeScript Source Files (.ts)       │
│ interface User { email: string; }   │
│ const find = (id: number): User =>  │
│   users[id];                        │
└────────────────┬────────────────────┘
                 │
                 ↓
        ┌────────────────┐
        │ TypeScript     │
        │ Compiler       │
        │ (tsc)          │
        │                │
        │ 1. Parse syntax│
        │ 2. Check types │
        │ 3. Generate JS │
        └────────┬───────┘
                 │
         ┌───────┴──────────────┐
         ↓                      ↓
    ❌ Type Errors         ✅ JavaScript
    (compilation fails)   (ready to run)
                          const find=(id)=>users[id];

        Errors prevent     No type info remains
        deployment         (erased after compile)
```

**Example Pipeline:**
```typescript
// TypeScript source (input)
interface User { id: number; email: string; }
const users: User[] = [];
users.push({ name: 'Alice' }); // ❌ TypeScript Error: missing 'id' & 'email'

// After compilation (output .js) — if types were valid:
const users = [];
users.push({ name: 'Alice' }); // ✅ Valid JavaScript (types removed)
```

### Core Type System Concepts

#### 1. Primitive Types
```typescript
// Basic types (same as JavaScript runtime values)
const age: number = 25;
const name: string = 'Alice';
const active: boolean = true;
const nothing: null = null;
const undefined_value: undefined = undefined;

// Why each matters:
// - number/string/boolean: Prevent operator type confusion
// - null/undefined: Distinguish "intentional absence" from "forgotten value"
```

#### 2. Union Types (One of These)
```typescript
// Role can ONLY be one of these strings
type Role = 'admin' | 'viewer' | 'editor';
const userRole: Role = 'admin';  // ✅ Valid
const userRole: Role = 'guest';  // ❌ Error

// Why: Restricts valid values to known set (safer than string)

// Union with multiple types
type ID = number | string;  // Can be either
const userId: ID = 123;    // ✅
const userId: ID = 'uuid'; // ✅
```

#### 3. Interfaces vs Types (What to Use When)
```typescript
// INTERFACE: Shape contract (what object must have)
interface User {
  id: number;
  email: string;
  isActive?: boolean;        // Optional field (?)
  readonly createdAt: Date; // Cannot be modified
}

// Why interface: Describes object structure, merges with other interfaces

// TYPE: Flexible alias (can be shape, union, primitive)
type UserRole = 'admin' | 'viewer';  // Union
type NumericString = string & { __numeric: true };  // Intersection
type EventHandler = (error: Error) => void;  // Function signature

// When to use:
// - Interface: DTO/database models (objects with known fields)
// - Type: Functions, unions, complex mapped types
```

#### 4. Generics (Reusable Patterns)
```typescript
// WITHOUT generics (repetitive):
interface StringArray { length: number; }
interface NumberArray { length: number; }
interface UserArray { length: number; }

// WITH generics (reusable):
interface Array<T> {  // T = "any type goes here"
  length: number;
  push(item: T): void;
  find(predicate: (item: T) => boolean): T | undefined;
}

// Usage:
const strings: Array<string> = ['a', 'b'];
const numbers: Array<number> = [1, 2];
const users: Array<User> = [{ id: 1, email: '...' }];

// Generic functions:
function first<T>(arr: T[]): T {
  return arr[0];
}
first([1, 2, 3]);        // ✅ Returns number
first(['a', 'b', 'c']); // ✅ Returns string

// WHY: DRY principle for types, reduces code duplication
```

#### 5. Type Inference (Let TypeScript Figure It Out)
```typescript
// Don't need to write type if compiler can infer it
const age = 25;              // ✅ Inferred: number
const name = 'Alice';        // ✅ Inferred: string
const items = [1, 2, 3];    // ✅ Inferred: number[]

// But explicit is sometimes better (for documentation):
const config: { timeout: number; retries: number } = {
  timeout: 5000,
  retries: 3,
};

// Where inference shines (complex types):
const findUser = (id: number) => users.find(u => u.id === id);
// ✅ Return type automatically inferred as User | undefined
```

#### 6. Strict Mode (The Safety Net)
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,  // Enables all strict checks
    // Which means:
    "noImplicitAny": true,      // No variables/params without type
    "strictNullChecks": true,   // null/undefined caught explicitly
    "strictFunctionTypes": true // Function params must match exactly
  }
}

// Benefits illustrated:
// WITH strictNullChecks: true
user?.email?.length;  // ✅ Must check if user/email exist
user.email.length;    // ❌ Error if email could be null

// This ONE feature prevents majority of production bugs
```

#### 7. Type Narrowing (Smart Type Refinement)
```typescript
// TypeScript narrows types based on runtime checks
function process(value: string | number) {
  // value could be string OR number here

  if (typeof value === 'string') {
    // Inside this block: value is narrowed to string
    value.toUpperCase(); // ✅ Available only on strings
  } else {
    // Inside this block: value is narrowed to number
    value.toFixed(2);    // ✅ Available only on numbers
  }
}

// Why this matters: Prevents "is not a function" errors in production
```

### Common TypeScript Patterns in NestJS

**Pattern 1: DTO (Data Transfer Object)**
```typescript
// DTOs enforce shape at HTTP boundary (Layer 2 validation)
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/[A-Z]/)  // Must contain uppercase
  password: string;
}

// When POST /users receives body:
// { "email": "invalid", "password": "weak" }
// NestJS ValidationPipe catches BEFORE controller executes
```

**Pattern 2: Discriminated Unions (Type-Safe State)**
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Usage:
const result: Result<User> = await findUser(id);
if (result.success) {
  console.log(result.data.email);  // ✅ Safe: data exists
} else {
  console.log(result.error);        // ✅ Safe: error exists
}

// Why: No undefined access, boolean flag + discriminated union
```

**Pattern 3: Generic Repository Pattern**
```typescript
// Instead of UserRepository, ProductRepository, ReviewRepository...
export class Repository<T> {
  async findById(id: number): Promise<T | null> {
    return await db.find(this.tableName, id);
  }

  async create(data: T): Promise<T> {
    return await db.insert(this.tableName, data);
  }
}

// DRY: One class for all entities
const users = new Repository<User>('users');
const products = new Repository<Product>('products');
```

### Common TypeScript Mistakes (What NOT to Do)

| Mistake | Example ❌ | Why Bad | Fix ✅ |
|---------|----------|--------|------|
| Over-use `any` | `const data: any = result;` | Disables type checking (defeats TypeScript's purpose) | Use proper types or `unknown` |
| Wrong union syntax | `type Config = string \| \| number;` | Double pipe confuses compiler | Use single pipe: `string \| number` |
| Missing optional `?` | `interface User { email?: string; }` then `user.email.length` without check | Crashes if email undefined | Check: `if (user.email) { ... }` |
| Inconsistent null handling | Function sometimes returns null, sometimes undefined | Inconsistent | Pick one or use union: `T \| null` |
| Forgetting to generate types | Type mismatch between database and code | Prisma types out of sync | Run `npx prisma generate` |

### When NOT to Use TypeScript

While TypeScript is the backbone of this project, there are reasons to avoid it:

| Scenario | Why to Skip TypeScript | Alternative |
|----------|---------------------|-------------|
| **Throwaway scripts** (~50 lines) | Compilation overhead not worth it | Plain JavaScript |
| **Learning JavaScript basics** | Types can hide what's happening | JavaScript first, then TypeScript |
| **Very small team without turnover** | Type overhead vs benefit calculation | Could work with careful JavaScript |
| **Real-time data processing** | Marginal performance edge needed | Go + gRPC, Rust, C++ |

### Production-Ready TypeScript Checklist

Before deploying, ensure:
- [ ] `strict: true` in `tsconfig.json`
- [ ] `noImplicitAny: true` (NO variables without types)
- [ ] `exactOptionalPropertyTypes: true` (fields can't be undefined if marked required)
- [ ] All `any` types have a comment explaining why
- [ ] DTOs used at HTTP boundary (class-validator)
- [ ] Database types generated from schema (`prisma generate`)
- [ ] Unit tests pass with TypeScript strict mode
- [ ] `npm run typecheck` passes before commit

📚 **External Resources:**
- [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/)
- [Advanced Types Deep Dive](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [NestJS + TypeScript Best Practices](https://docs.nestjs.com/techniques/database)

---

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

## Callbacks, Promises, and Async/Await: Mastering Asynchronous Patterns

> This section explains asynchronous programming from first principles. It's the foundation of everything in Node.js.

### What is a Callback? (Definition)

A **callback** is a function passed as an argument to another function, to be executed later (usually when something finishes).

**Simple analogy:**
```
Synchronous:    "Call the coffee shop, wait on phone, get answer"
Asynchronous:   "Call the coffee shop, give them your number,
                 they call you back when coffee is ready"
```

```javascript
// Callback syntax (function passed as argument)
function readFile(filename, callback) {
  // ... some work ...
  const data = 'file contents';
  callback(data);  // Execute the callback function
}

// Usage: Pass a function as argument
readFile('data.txt', (content) => {
  console.log('File received:', content);
});
```

### Why Callbacks Exist (The Problem They Solve)

**Scenario:** Your API needs to read a 500MB file from disk. This takes 3 seconds.

**Approach 1: Blocking/Synchronous ❌**
```javascript
const data = fs.readFileSync('huge.dat');  // Blocks for 3 seconds
response.send(data);
// During those 3 seconds, ALL other users' requests wait. That's unacceptable.
```

**Approach 2: Non-Blocking/Asynchronous ✅**
```javascript
fs.readFile('huge.dat', (err, data) => {
  response.send(data);  // Called when file is ready (3 seconds later)
});
// Other requests process while waiting. 1000 users = 1000 reads in parallel.
```

**This is why callbacks exist:** To prevent blocking while waiting for I/O (disk, network, database).

### Callback Hell (The Problem with Callbacks)

When you have nested callbacks, code becomes hard to read:

```javascript
// ❌ Callback Hell (Pyramid of Doom)
fs.readFile('config.json', (err, config) => {
  database.connect(config, (err, db) => {
    db.query('SELECT * FROM users', (err, users) => {
      cache.set(users, (err) => {
        response.send(users);  // Finally send response!
      });
    });
  });
});
```

**Problems:**
1. **Readability:** Hard to follow nested function scopes
2. **Error handling:** `err` at each level (unclear which operation failed)
3. **Late binding:** Impossible to know function signature without reading all levels

### Promises (The First Solution)

A **Promise** is a wrapper around a pending computation, with three states:

```
┌─────────────────────────────────────┐
│ Promise (represents future value)   │
│                                     │
│ States:                             │
│ 1. Pending — waiting for result    │
│ 2. Fulfilled — has value ✅         │
│ 3. Rejected — has error ❌          │
└─────────────────────────────────────┘
```

```javascript
// Creating a Promise
const filePromise = new Promise((resolve, reject) => {
  fs.readFile('data.txt', (err, data) => {
    if (err) reject(err);      // Transition to Rejected
    else resolve(data);         // Transition to Fulfilled
  });
});

// Consuming a Promise (.then / .catch)
filePromise
  .then(data => console.log('Got:', data))      // If fulfilled
  .catch(err => console.error('Error:', err));  // If rejected
```

**Promises vs Callbacks:**
```javascript
// Callbacks (each operation takes callback)
fs.readFile('a.txt', (err, a) => {
  fs.readFile('b.txt', (err, b) => {
    combine(a, b);
  });
});

// Promises (can chain with .then())
fs.promises.readFile('a.txt')
  .then(a => fs.promises.readFile('b.txt').then(b => combine(a, b)))
  .catch(err => console.error(err));
```

**Why Promises are better:**
- Single standard `reject/resolve` flow (not `(err, data)` pattern)
- Can chain multiple operations
- `.catch()` handles all errors (not required at each level)

### Async/Await (The Modern Standard)

Async/await is **syntactic sugar over Promises** that makes code look synchronous while being asynchronous.

```javascript
// Traditional Promise
function getUser(id) {
  return database.query('SELECT * FROM users WHERE id = ?', [id])
    .then(user => user ? user : Promise.reject('Not found'))
    .catch(err => console.error(err));
}

// Async/Await (same logic, cleaner syntax)
async function getUser(id) {
  try {
    const users = await database.query('SELECT * FROM users WHERE id = ?', [id]);
    const user = users[0];
    if (!user) throw new Error('Not found');
    return user;
  } catch (err) {
    console.error(err);
  }
}
```

**Key Points:**
- `async` keyword on function signals "may use await inside"
- `await` pauses function until Promise resolves
- `try/catch` for error handling (familiar from synchronous code)
- Return value is automatically wrapped in Promise

**Execution Flow Example:**
```javascript
async function processOrder(orderId) {
  console.log('1. Start');

  const order = await fetchOrder(orderId);        // Waits ~100ms
  console.log('2. Got order:', order);

  const inventory = await checkInventory(order);  // Waits ~50ms
  console.log('3. Inventory available');

  const payment = await processPayment(order);    // Waits ~200ms
  console.log('4. Payment processed');

  return { order, inventory, payment };           // Total: ~350ms
}

// When called:
processOrder(123).then(result => console.log('Final:', result));
```

### When to Use Each

| Pattern | When | Example |
|---------|------|----------|
| **Callbacks** | Legacy code, learning basics | Node file system pre-Promises |
| **Promises** | Complex chains, need compatibility | jQuery, some older libraries |
| **Async/Await** | Modern code (Node 8+) [USE THIS] | NestJS services, controllers |

### Common Async Mistakes

```typescript
// ❌ MISTAKE 1: Forgetting await
async function processUsers() {
  const users = database.findMany();  // Returns Promise, not array!
  return users.map(u => u.email);     // Type error: Promise has no map()
}

// ✅ FIX
async function processUsers() {
  const users = await database.findMany();  // Now it's an array
  return users.map(u => u.email);
}

// ❌ MISTAKE 2: Not handling errors in async context
async function dangerousCode() {
  throw new Error('Something failed');
  // No try/catch — error propagates unexpectedly
}

// ✅ FIX
async function safeCode() {
  try {
    throw new Error('Something failed');
  } catch (err) {
    console.error('Handled:', err);
    return null;  // Graceful failure
  }
}

// ❌ MISTAKE 3: Sequential when parallel is possible
async function slowFetch() {
  const user = await getUser(1);      // Waits 100ms
  const posts = await getPosts(user); // Waits 100ms
  return { user, posts };             // Total: 200ms
}

// ✅ FIX: Parallel operations
async function fastFetch() {
  const [user, posts] = await Promise.all([
    getUser(1),        // Starts now
    getPosts(user)     // Starts now (no await)
  ]);
  return { user, posts };  // Total: ~100ms (runs parallel)
}
```

### Async Patterns in NestJS

**Pattern 1: Controller with async method**
```typescript
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: number): Promise<User> {
    // Async controller automatically handles Promise
    // If Promise rejects, Exception Filter catches it
    return await this.userService.findById(id);
  }
}
```

**Pattern 2: Service with multiple async operations**
```typescript
@Injectable()
export class OrderService {
  async createOrder(data: CreateOrderDto): Promise<Order> {
    // Sequential when order matters
    const user = await this.validateUser(data.userId);
    const inventory = await this.checkInventory(data.items);
    const order = await this.saveOrder(data);

    // Parallel when independent
    const [payment, shipment] = await Promise.all([
      this.processPayment(order),
      this.arrangeShipment(order)
    ]);

    return order;
  }
}
```

**Pattern 3: Handling errors in async operations**
```typescript
@Get('/with-fallback')
async findUserWithFallback(@Query('email') email: string): Promise<User> {
  try {
    return await this.userService.findByEmail(email);
  } catch (error) {
    // Log error for debugging
    this.logger.error(`User not found: ${email}`, error);

    // Return fallback or throw specific exception
    throw new NotFoundException(`User ${email} not found`);
  }
}
```

### Understanding Callback Hell in Modern Context

While async/await is preferred, understanding callbacks is crucial for debugging:

```typescript
// Modern NestJS code STILL uses callbacks under the hood for events
export class OrderListener {
  onModuleInit() {
    // Event listener (callback pattern)
    this.eventEmitter.on('order.created', (order) => {
      this.notificationService.sendConfirmation(order);
    });
  }
}

// Message queue listeners (Redis/RabbitMQ)
this.queue.on('completed', (job) => {
  console.log('Job completed:', job.id);
});
```

📚 **External Resources:**
- [JavaScript.info: Promises](https://javascript.info/promise-basics)
- [JavaScript.info: Async/Await](https://javascript.info/async-await)
- [MDN: Event Loop Visualization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)

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

## Production Failure Handling: Strategies for Real-World Systems

> Systems fail. The question is: how do you fail gracefully? This section teaches failure handling patterns used in production applications.

### Types of Failures in Web Applications

Every production system experiences failures across three categories:

#### 1. Network Failures
```
┌────────────┐
│  Client    │
└────┬───────┘
     │ Request with no response
     ↓
┌────────────────────┐
│ Network lost       │  ← Connection dropped (WiFi, ISP)
│ Server unreachable │  ← DNS resolution failed
│ Timeout            │  ← Server offline, but request hangs for 30 seconds
└────────────────────┘
```

**Real-world scenario:**
```typescript
// ❌ WITHOUT handling
const response = await fetch('https://payment-api.com/charge');
console.log(response.status);  // If network fails, crashes here

// ✅ WITH handling
try {
  const response = await fetch('https://payment-api.com/charge', {
    signal: AbortSignal.timeout(5000)  // Timeout after 5 seconds
  });
  console.log(response.status);
} catch (err) {
  if (err.name === 'AbortError') {
    logger.warn('Payment API timeout after 5s');
    // Retry with exponential backoff
  } else {
    logger.error('Payment API unreachable', err);
  }
}
```

#### 2. Runtime Errors (Bugs)
```
┌─────────────────────────────────────────┐
│ Code executes but throws error:         │
│ - TypeError: user.email is undefined    │
│ - ReferenceError: unknownVariable not   │
│ - JSON.parse() on invalid JSON          │
│ - Division by zero (infinite result)    │
└─────────────────────────────────────────┘
```

**Real-world scenario:**
```typescript
// ❌ BEFORE
export class UserService {
  async findByEmail(email: string): Promise<User> {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];  // ❌ If array is empty, returns undefined
    // Caller gets `user.id.toString()` → TypeError
  }
}

// ✅ AFTER
async findByEmail(email: string): Promise<User | null> {
  const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) return null;
  return users[0];
}

// Caller must handle null explicitly
const user = await userService.findByEmail('test@example.com');
if (user) {
  console.log(user.id);
} else {
  throw new NotFoundException('User not found');
}
```

#### 3. Logical Errors (Incorrect Business Logic)
```
┌─────────────────────────────────────────────┐
│ Code runs without error but produces        │
│ wrong result:                               │
│ - Charging customer twice                   │
│ - Deleting wrong record                     │
│ - Calculating discount wrong ($100 → -$50)  │
│ - Allowing customer to buy out-of-stock     │
└─────────────────────────────────────────────┘
```

**Real-world scenario:**
```typescript
// ❌ BUG: Accepts negative quantity
const addToCart = async (itemId: number, qty: number) => {
  const item = await itemService.findById(itemId);
  cart.items.push({ item, qty });  // What if qty is -5?
};

// ✅ FIX: Add input validation
const addToCart = async (itemId: number, qty: number) => {
  if (qty <= 0) throw new BadRequestException('Quantity must be > 0');
  if (qty > item.stock) throw new BadRequestException('Insufficient stock');

  const item = await itemService.findById(itemId);
  cart.items.push({ item, qty });
};
```

### Error Handling Strategy #1: Try/Catch (The Foundation)

```typescript
// Pattern: Wrap risky operations
try {
  // Code that might throw
  const data = JSON.parse(userInput);  // May throw SyntaxError
  const result = await database.query(sql);  // May throw OperationalError
} catch (err) {
  // Handle the error
  if (err instanceof SyntaxError) {
    logger.error('Invalid JSON from client');
    return BAD_REQUEST;
  } else if (err.message === 'ECONNREFUSED') {
    logger.error('Database connection failed');
    return SERVICE_UNAVAILABLE;  // Try again later
  } else {
    logger.error('Unknown error:', err);
    return INTERNAL_ERROR;
  }
} finally {
  // Code that runs regardless (cleanup)
  await connection.end();
}
```

### Error Handling Strategy #2: Structured Logging (The Debugger)

**Problem:** Error happens in production, user sees "500 Error", you have no idea why.

```typescript
// ❌ BAD
console.error('Error:', error);
// Output: "Error: undefined" (no context)

// ✅ GOOD: Structured logging with context
logger.error('Database query failed', {
  userId: req.user.id,
  endpoint: req.path,
  method: req.method,
  durationMs: Date.now() - startTime,
  error: error.message,
  stack: error.stack,
  sql: sanitizeSQL(error.sql),  // Don't expose passwords
  context: 'findUsersByRole'
});
// Output: { userId: 42, endpoint: '/api/users', error: 'ECONNREFUSED', ... }
// Now you can search logs by userId or endpoint
```

**In NestJS (using Winston Logger):**
```typescript
@Injectable()
export class AppService {
  constructor(private logger: Logger) {}

  async createUser(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({ data });
    } catch (err) {
      this.logger.error('User creation failed', {
        email: data.email,
        error: err.message,
        code: err.code,
      });
      throw new BadRequestException('Could not create user');
    }
  }
}
```

### Error Handling Strategy #3: Retry Mechanisms (The Resilience)

**Problem:** Network hiccup causes request to fail, but retrying would succeed.

```typescript
// Exponential backoff retry pattern
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();  // Success → return
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;  // Last attempt failed → give up
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);  // 100ms, 200ms, 400ms
      logger.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
}

// Usage:
const result = await retryWithBackoff(
  () => externalAPI.fetchUserData(userId),
  3  // 3 retries
);
```

**When to retry:**
- ✅ Network timeout: Likely transient
- ✅ Database connection lost: Will likely recover
- ❌ Invalid input: Retrying won't help
- ❌ User not authorized: Retrying makes it worse (security risk)

### Error Handling Strategy #4: Graceful Degradation (The Workaround)

**Problem:** Service A depends on Service B. Service B goes down. Should Service A fail completely?

```typescript
// ❌ WITHOUT graceful degradation
async getProductsWithRecommendations(productId: number) {
  const product = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
  const recommendations = await recommendationService.get(productId);
  // If recommendation service is down, entire request fails
  return { product, recommendations };
}

// ✅ WITH graceful degradation
async getProductsWithRecommendations(productId: number) {
  const product = await db.query('SELECT * FROM products WHERE id = ?', [productId]);

  let recommendations = [];
  try {
    recommendations = await retryWithBackoff(
      () => recommendationService.get(productId),
      2
    );
  } catch (err) {
    // Recommendation service down, but still return product
    logger.warn('Recommendation service unavailable, returning empty recommendations');
    // User gets product info, just without recommendations
  }

  return { product, recommendations };
}
```

**Real-world example:**
- Amazon product page loads even if recommendation engine is down
- Netflix still plays video if subtitles service fails
- Your app returns data even if analytics service is down

### Error Handling Strategy #5: Circuit Breaker Pattern (The Overload Protector)

**Problem:** Service B is struggling (CPU maxed, database saturated). Sending more requests makes it worse.

```
Normal State:        Failing State:        Open State (Circuit Open):
Request → Service    Request → Service    Service struggling
  ↓                    ↓                  ✅ Stop sending requests
 200 OK              500 Error            ✅ Return cached/fallback
                                          ✅ Let service recover
                                          After timeout:
                                          Try 1 request (Half-Open)
                                          If 200 OK → Close circuit (resume)
```

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttemptTime = Date.now();

  async call<T>(fn: () => Promise<T>): Promise<T> {
    // If open and timeout not reached, fail fast
    if (this.state === 'OPEN' && Date.now() < this.nextAttemptTime) {
      throw new Error('Circuit breaker is OPEN, service temporarily unavailable');
    }

    try {
      const result = await fn();  // Attempt call
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';  // Success → close circuit
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      if (this.failures > 5) {
        this.state = 'OPEN';  // Too many failures → open circuit
        this.nextAttemptTime = Date.now() + 30_000;  // Wait 30 seconds
      }
      throw err;
    }
  }
}

// Usage:
const paymentCircuitBreaker = new CircuitBreaker();

@Post('/orders')
async createOrder(data: OrderData) {
  try {
    await paymentCircuitBreaker.call(() =>
      paymentService.charge(data.amount)
    );
  } catch (err) {
    logger.error('Payment service unavailable after circuit open');
    throw new ServiceUnavailableException('Payment service temporarily down');
  }
}
```

### Error Handling Strategy #6: Validation at System Boundaries

```
External Input (User)
    ↓
[VALIDATE] ← ← ← ← ← Strictest validation
    ↓ (if invalid, reject immediately)
Internal Services
    ↓
[Light validation] ← Trust internal code
    ↓
Database
```

```typescript
// Layer 1: HTTP Body Validation (NestJS ValidationPipe)
export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'password must contain uppercase' })
  password: string;
}

// If client sends { "email": "notanemail", "password": "short" }
// NestJS rejects with 400 before controller runs

// Layer 2: Business Logic Validation (in service)
async createUser(dto: CreateUserDto): Promise<User> {
  // DTO validation already passed, so email is valid format
  const existing = await this.findByEmail(dto.email);

  if (existing) {
    throw new ConflictException('Email already registered');
  }

  return this.db.user.create({ data: dto });
}
```

### Error Handling Checklist for Production

Before deploying, ensure every service has:

- [ ] **Try/Catch** around all I/O (database, HTTP, files)
- [ ] **Structured Logging** with context (userId, endpoint, error code)
- [ ] **Retry Logic** for transient failures (with exponential backoff)
- [ ] **Graceful Degradation** when dependencies fail
- [ ] **Circuit Breaker** for external services
- [ ] **Input Validation** at HTTP boundaries
- [ ] **Error Monitoring** (Sentry, DataDog) to alert on unusual error patterns
- [ ] **Error Budget**: Plan for failures, monitor error rates
- [ ] **Recovery Procedures**: Incident runbook (what to do when X fails)

### Common Failure Scenarios in This Project

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| Database down | All requests fail | Implement retry + circuit breaker, fallback to read-only cache |
| Redis down | Rate limits don't work, cache unavailable | Graceful degradation: use in-memory fallback, disablecache temporarily |
| External payment API timeouts | Orders can't be placed | Implement retry + timeout (5s), queue orders, retry in background |
| File upload fails | User can't upload menu PDF | Retry with exponential backoff, show user-friendly error message |
| JWT validation fails | Legitimate user locked out | Log error with token details, alert ops, have manual unlock procedure |

📚 **External Resources:**
- [Release It!: Design and Deploy Production-Ready Software](https://www.amazon.com/Release-Production-Ready-Software-Pragmatic-Programmers/dp/0978739213) — The definitive production failure handbook
- [SRE Book: Error Budgets](https://sre.google/books/) — Google's approach to failure tolerance
- [Retry Strategies](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — AWS guidance on retries

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

## Architecture Decisions Explained: The Rationale Behind Every Choice

> Understanding *why* we made architectural decisions is as important as *how* we implement them. This prevents you from making the same mistakes in future projects.

### Decision 1: Why NestJS Instead of Express/Fastify?

| Aspect | Express | Fastify | NestJS | Choice |
|--------|---------|---------|--------|--------|
| **Learning curve** | Low (minimal framework) | Medium (focused) | High (opinionated) | NestJS |
| **Scalability** | Manual (middleware soup) | Better (plugins) | Excellent (modules) | NestJS |
| **Team onboarding** | Inconsistent patterns | Better structure | Clear contracts | NestJS |
| **Type safety** | Optional (very) | Better | Built-in (decorators) | NestJS |
| **Enterprise readiness** | Low (DIY everything) | Medium | High (batteries included) | NestJS |

**Why NestJS for Coffee Logic:**
- **Modularity:** Feature modules (`UserModule`, `AuthModule`) scale to 50+ engineers
- **Dependency Injection:** Reduces coupling, makes testing trivial
- **Decorators:** Express uses `app.get()`, NestJS uses `@Get()` — your IDE understands decorators better
- **Ecosystem:** Guards, Filters, Pipes are NestJS abstractions that don't exist in Express

**Trade-off:** More abstraction means steeper learning curve. For learning projects, Express is fine.

### Decision 2: Why Prisma ORM Instead of TypeORM/Sequelize?

| Aspect | Sequelize | TypeORM | Prisma | Choice |
|--------|-----------|---------|--------|--------|
| **Type generation** | Manual `@Column` decorators | Manual decorators | Automatic from schema | Prisma |
| **Query builder syntax** | SQL-like strings | Excellent type inference | Best type inference | Prisma |
| **Migration experience** | Manual up/down scripts | Manual scripts | Auto-generates based on schema | Prisma |
| **Debugging** | SQL strings | Visible | Formatted SQL in logs | Prisma |
| **Learning curve** | Easy (SQL-like) | Medium | Easy (intuitive) | Prisma |

**Why Prisma for Coffee Logic:**
- **Schema-first approach:** Write schema once in `schema.prisma`, get typed queries automatically
- **Type safety by default:** `const user: User = await prisma.user.findUnique(...)`
- **Studio:** GUI database browser (`npx prisma studio`) invaluable for development
- **Migrations are reproducible:** No risk of SQL scripts conflicting in shared repos

**Trade-off:** Prisma is newer, ecosystem smaller than TypeORM.

### Decision 3: Why PostgreSQL Instead of MongoDB/MySQL?

| Aspect | MongoDB | MySQL | PostgreSQL | Choice |
|--------|---------|-------|-----------|--------|
| **Consistency** | Eventual (eventually correct) | Strong (ACID) | Strong (ACID) | PostgreSQL |
| **Complex queries** | Limited (document scans) | Excellent | Excellent | PostgreSQL |
| **Migrations** | Schemaless (riskier) | Schema-based | Schema-based | PostgreSQL |
| **Transactions** | Recent (4.0+) | Yes, well-tested | Yes, mature | PostgreSQL |
| **Ecosystem** | Growing | Mature | Mature | PostgreSQL |

**Why PostgreSQL for Coffee Logic:**
- **ACID compliance:** If order processing fails, rollback is guaranteed (MongoDB doesn't)
- **Complex queries:** Inventory management needs `SELECT * FROM inventory WHERE batch_id = ? AND expiry > NOW()` — MongoDB struggles with this
- **Referential integrity:** Foreign key constraints prevent orphaned records
- **JSON support:** Can store JSON for flexible schema when needed (best of both worlds)

**Trade-off:** PostgreSQL requires schema planning. MongoDB is "easier" initially.

### Decision 4: Why JWT (Stateless) Instead of Sessions?

```
Session = "Remember everything about this user in Redis"
JWT    = "User carries a signed token proving who they are"
```

| Scenario | Sessions | JWT | Coffee Logic |
|----------|----------|-----|--------------|
| 1 server | ✅ Simple | ✅ Also simple | Either works |
| 10 servers (1 Redis) | ✅ Works | ✅ Works (better) | JWT (stateless) |
| 100 servers (3 Redis) | ⚠️ Complex (cache stampede) | ✅ Scales | JWT |
| User logs out | ✅ Immediate | ❌ Delayed (wait for expiry) | JWT + blacklist |

**Why JWT for Coffee Logic:**
- **Stateless auth:** API server doesn't need to query Redis on every request
- **Microservices-ready:** Each service can verify JWT independently
- **Mobile-friendly:** Apps store token locally, don't need cookies

**Trade-off:** No immediate logout (user  could use token until expiry). Solution: token blacklist (Phase 6).

### Decision 5: Why Redis for Caching Instead of In-Memory?

| Strategy | In-Memory Map | Redis | Coffee Logic |
|----------|---------------|-------|--------------|
| Phase 1 | ✅ Works | N/A | In-Memory |
| 2 servers | ❌ Duplicate caches | ✅ Shared | Upgrade to Redis |
| Server restarts | ❌ Cache lost | ✅ Persistent | Upgrade to Redis |
| Eviction policy | Manual | Automatic (LRU, TTL) | ✅ Redis |

**Why Redis for Caching (Phase 5+):**
```typescript
// Phase 1-2: In-memory (single server only)
const cache = new Map();
cache.set('products', products);

// Phase 5+: Redis (distributed)
await redis.set('products', JSON.stringify(products), 'EX', 3600);
```

**Trade-off:** Redis adds operational complexity. Worth it at scale.

### Decision 6: Why BullMQ (Job Queues) for Heavy Operations?

**Problem:** PDF generation takes 30 seconds. User waits 30 seconds. Bad UX.

```
WITHOUT queue:
User requests PDF → Wait 30s → Server blocks → Other requests slow down ❌

WITH queue:
User requests PDF → Add to queue → Return immediately ✅
Background worker processes PDF → Send via email when done
```

**Why BullMQ:**
- Built on Redis (already using it)
- Retry logic included (if job fails, auto-retry with backoff)
- Clear APIs: `await queue.add()`, `queue.on('completed')`
- Monitoring: Can track job status

**When to use:** PDF generation, email sending, bulk exports, image processing

### Decision 7: Why Docker for Deployment?

**Alternative 1:** "Just push Node.js to server"
```
❌ "Works on my machine!" syndrome
❌ Different versions: My machine has Node 18, production has Node 16
❌ Operating system differences: Windows vs Linux
❌ Dependency conflicts: My npm install has different versions than production
```

**With Docker:**
```dockerfile
FROM node:18-alpine
COPY . /app
RUN npm install
CMD ["node", "dist/main.js"]
```
✅ Exact same environment locally and production
✅ Reproducible builds
✅ Easy rollback (revert Docker image instead of SSH into server)

**Trade-off:** Docker has learning curve. Worth it by Phase 5.

### Decision 8: Why Nginx for Load Balancing?

```
1 NestJS server = 1000 requests/second
3 NestJS servers + Nginx = 3000 requests/second

Nginx distributes traffic:
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A (round-robin)
```

**Why Nginx:**
- Battle-tested (powers 40% of internet)
- Lightweight (uses 10MB memory vs others use 100MB+)
- Simple config
- Supports multiple load-balancing strategies (round-robin, least_conn, hash)

**When to add:** Once you have multiple API instances (Phase 6+).

### Decision 9: Why Cloudflare for CDN?

```
Without CDN:
User in Tokyo requests API in us-east-1
Travel time: ~150ms just for network round-trip ❌

With Cloudflare:
Cloudflare edge server in Tokyo ← Cached response ✅
Return in 10ms, no backend query needed
```

**Why Cloudflare:**
- Global edge network (210+ cities)
- DDoS protection included
- SSL/TLS termination
- Caching rules (cache static assets forever, API responses 10 minutes)

**Cost:** $20/month is worth it at scale.

### Decision 10: Why Supabase (Managed Database)?

**Alternative:** Self-hosted PostgreSQL
```
Pro: Cheapest
Con: You handle backups, security patches, monitoring, scaling
     One mistake = data loss + security breach + midnight call
```

**Supabase (Managed):**
```
Pro: Backups automatic, security patches automatic, monitoring included
Con: $25+/month vs $0 self-hosted
```

**For startups/learning:** Supabase ROI is worth it (one security incident costs more than a year of Supabase).

### Architecture Summary: Progression by Phase

| Aspect | Phase 1-2 | Phase 3-4 | Phase 5-6 | Phase 7 |
|--------|-----------|-----------|-----------|---------|
| Caching | In-Memory | ← | Redis | ← |
| Rate Limiting | In-Memory | ← | Redis | ← |
| Jobs | None | Implement BullMQ | BullMQ | ← |
| Deployment | Docker Compose local | + Docker images | + Orchestration | Railway |
| Monitoring | Console logs | Winston + local files | ELK/Datadog | Datadog alerts |
| Database | Local PostgreSQL | + Migrations | + Connection Pool | Supabase |

Each decision builds on previous phase, avoiding premature optimization.

---

## Core Architectural Patterns: Building Maintainable Systems

> The difference between junior code and senior code isn't syntax—it's architecture. This section teaches patterns used in every phase.

### Pattern 1: Dependency Injection (DI) — The Inversion of Control

**Problem:** Hard-coded dependencies make code brittle.

```typescript
// ❌ TIGHTLY COUPLED (hard to test, hard to change)
class UserService {
  constructor() {
    this.database = new PostgresDatabase();  // Hard-coded dependency
    this.logger = new FileLogger();          // Hard-coded dependency
  }

  async createUser(data: CreateUserDto) {
    this.logger.log('Creating user');        // Fixed: always FileLogger
    return this.database.insert('users', data);
  }
}

// To test, you're forced to test with real database ❌
new UserService().createUser({ ... });
```

**Solution:** Inject dependencies from outside.

```typescript
// ✅ LOOSELY COUPLED (easy to test, easy to swap)
class UserService {
  constructor(
    private database: Database,            // Injected
    private logger: Logger                  // Injected
  ) {}

  async createUser(data: CreateUserDto) {
    this.logger.log('Creating user');
    return this.database.insert('users', data);
  }
}

// In app bootstrap, wire everything together
const db = new PostgresDatabase();
const logger = new ConsoleLogger();
const userService = new UserService(db, logger);

// In tests, swap with mocks
const mockDb = { insert: jest.fn() };
const mockLogger = { log: jest.fn() };
const service = new UserService(mockDb, mockLogger);
await service.createUser({ ... });
// ✅ Can now assert mockDb.insert was called
```

**NestJS makes DI automatic with decorators:**

```typescript
@Injectable()
export class UserService {
  constructor(
    // NestJS automatically injects these
    @Inject(DATABASE_CONNECTION) private db: Database,
    private logger: Logger,
  ) {}
}

// NestJS's `ModuleMetadata` wires it all:
@Module({
  providers: [UserService, Logger, { provide: DATABASE_CONNECTION, useValue: db }],
})
export class UserModule {}
```

**Benefits:**
- **Testability:** Mock dependencies in tests
- **Flexibility:** Swap implementations at runtime
- **Maintenance:** Change one service, all dependents still work
- **Scalability:** Services remain loosely coupled at team scale

### Pattern 2: Separation of Concerns (SoC) — One Responsibility Per Class

**Problem:** Everything in one big class is hard to understand and test.

```typescript
// ❌ KITCHEN SINK (does 5 things, impossible to test one part independently)
class UserController {
  @Post('/register')
  register(dto: RegisterDto) {
    // Validation
    if (!dto.email.includes('@')) throw new Error('Invalid email');

    // Database business logic mixed with HTTP handling
    const existing = database.query('SELECT * FROM users WHERE email = ?', [dto.email]);
    if (existing) throw new Error('Email taken');

    // Hashing password
    const hash = bcrypt.hashSync(dto.password, 10);

    // Saving
    database.query('INSERT INTO users VALUES (...)', [dto.email, hash]);

    // Sending email
    sendgrid.send({ to: dto.email, body: 'Welcome!' });

    // Logging
    console.log('User registered:', dto.email);

    return { success: true };
  }
}

// Testing: To test email sending, must hit database and mock HTTP response
```

**Solution:** Each class does one thing.

```typescript
// ✅ SEPARATED CONCERNS

// 1. DTOs handle validation at boundary
export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

// 2. Service handles business logic
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('Email already registered');

   return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await this.hashPassword(dto.password),
      },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

// 3. Notification service sends email
@Injectable()
export class NotificationService {
  async sendWelcomeEmail(email: string): Promise<void> {
    await this.sendgrid.send({
      to: email,
      subject: 'Welcome to Coffee Logic',
      body: 'Your account is ready!',
    });
  }
}

// 4. Logging is separate (cross-cutting concern)
@Injectable()
export class AuditLogger {
  log(action: string, metadata: object): void {
    console.log(JSON.stringify({ action, metadata, timestamp: new Date() }));
  }
}

// 5. Controller orchestrates (HTTP layer only)
@Controller('/auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private notificationService: NotificationService,
    private auditLogger: AuditLogger,
  ) {}

  @Post('/register')
  async register(@Body() dto: RegisterDto): Promise<{ success: boolean }> {
    const user = await this.userService.register(dto);
    await this.notificationService.sendWelcomeEmail(user.email);
    this.auditLogger.log('user_registered', { userId: user.id });
    return { success: true };
  }
}

// Now testing is easy:
describe('UserService', () => {
  it('should reject duplicate email', async () => {
    const mockPrisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) } };
    const service = new UserService(mockPrisma);

    await expect(service.register({ email: 'taken@example.com', password: '...h }))
      .rejects.toThrow(ConflictException);
  });
});
```

**Benefits:**
- **Testability:** Each class tested independently
- **Reusability:** NotificationService can be used in multiple controllers
- **Maintainability:** Changing email logic doesn't affect user service
- **Clarity:** New developer reads UserService and immediately knows "it handles user creation"

### Pattern 3: The Repository Pattern (Database Abstraction)

**Problem:** Business logic is mixed with database queries.

```typescript
// ❌ MIXED CONCERNS
export class ProductService {
  async getProductsInStock() {
    // SQL knowledge required here
    const result = await this.prisma.$queryRaw`
      SELECT * FROM products
      WHERE stock > 0
      AND updated_at > NOW() - INTERVAL '7 days'
      ORDER BY popularity DESC
    `;
    return result;
  }
}
```

**Solution:** Repository abstracts database.

```typescript
// ✅ ABSTRACTED DATABASE

// Repository (data access layer)
@Injectable()
export class ProductRepository {
  constructor(private prisma: PrismaService) {}

  async findInStock(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        stock: { gt: 0 },
        updatedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { popularity: 'desc' },
    });
  }
}

// Service (business logic)
@Injectable()
export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async getProductsInStock(): Promise<Product[]> {
    return this.productRepository.findInStock();
  }
}

// Benefits:
// - Change from Prisma to Sequelize? Update only ProductRepository
// - Test service? Mock repository with fake data
// - SQL knowledge not required in service layer
```

**NestJS Tip:** Use `@Global()` to share repositories:

```typescript
@Global()
@Module({
  providers: [PrismaService, ProductRepository, UserRepository],
  exports: [PrismaService, ProductRepository, UserRepository],
})
export class RepositoryModule {}

// Now any module can inject ProductRepository without explicit imports
```

### Pattern 4: When to Use Which Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| **Fetching user from DB** | Repository | `const user = await userRepository.findById(id)` |
| **Validating user input** | DTO + ValidationPipe | `@IsEmail() email: string` |
| **Sending email after action** | Event emitter | `this.eventEmitter.emit('user.registered', user)` |
| **Handling database errors** | Exception filter | `catch (PrismaClientKnownRequestError)` |
| **Logging all requests** | Middleware | Create correlation ID on each request |
| **Checking permissions** | Guard | `@Roles('admin')` decorator |

### Testing Strategies for Maintainable Code

> Tests aren't just verification—they're documentation of expected behavior. They drive architecture.

**Levels of Testing:**

```
Unit Tests (60%) — Test one function in isolation
  Example: UserService.register() with mocked database
  Time: 0.001s each, fast feedback
  Cost: Low — mock everything

Integration Tests (25%) — Test multiple components together
  Example: POST /auth/register end-to-end with test DB
  Time: 0.1-1s each, slower
  Cost: Medium — need test database

E2E Tests (15%) — Test entire system like a user
  Example: Browser clicks "Register", sees confirmation email
  Time: 5-30s each, very slow
  Cost: High — need full environment

Total coverage target: 80%+ for production code
```

**Unit Test Example (UserService):**

```typescript
describe('UserService.register', () => {
  it('should hash password and save user', async () => {
    // Arrange (setup)
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),  // Email doesn't exist
        create: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
      },
    };
    const service = new UserService(mockPrisma);

    // Act (execute)
    const result = await service.register({
      email: 'test@example.com',
      password: 'SecurePassword123!',
    });

    // Assert (verify)
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@example.com' }),
      })
    );
    expect(result.id).toBe(1);
    // Password was hashed (not passed plaintext to DB)
    expect(mockPrisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      'SecurePassword123!'
    );
  });

  it('should throw ConflictException if email exists', async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 999 }),  // Email exists
      },
    };
    const service = new UserService(mockPrisma);

    await expect(
      service.register({ email: 'taken@example.com', password: '...' })
    ).rejects.toThrow(ConflictException);
  });
});
```

**Integration Test Example (NestJS E2E):**

```typescript
describe('POST /auth/register (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('should register user and return JWT token', async () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body.user.email).toBe('newuser@example.com');

    // Verify user was actually saved to database
    const savedUser = await prisma.user.findUnique({
      where: { email: 'newuser@example.com' },
    });
    expect(savedUser).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    const dto = { email: 'duplicate@example.com', password: 'password' };

    // Register first time
    await request(app.getHttpServer()).post('/auth/register').send(dto).expect(201);

    // Try again
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(409);
  });
});
```

**Test Checklist Before Production:**

- [ ] Unit tests for all business logic (80%+ coverage)
- [ ] Integration tests for critical flows (registration, payment)
- [ ] Happy path (success scenario) + sad paths (error scenarios)
- [ ] Edge cases (empty input, max length, special characters)
- [ ] Authorization tests (admin can, regular user cannot)
- [ ] All database queries tested with real schema
- [ ] Error messages are helpful (not "Error" but "Email already registered")

---

## Senior-Level Engineering: Edge Cases, Gotchas, and Production Readiness

> The difference between systems that survive 3 AM page alerts and those that don't is anticipating edge cases and designing for failure.

### Edge Cases: What Catches Junior Engineers

#### 1. Race Conditions (Concurrent Operations)

**Scenario:** User clicks "Buy" twice in 100ms.

```typescript
// ❌ VULNERABLE (race condition)
async buyProduct(userId: number, productId: number) {
  const product = await db.product.findUnique({ where: { id: productId } });

  if (product.stock < 1) throw new OutOfStockException();
  // ⚠️ Between check and update, another request could buy last item

  await db.product.update({
    where: { id: productId },
    data: { stock: product.stock - 1 },
  });
}

// Two requests race:
// Request 1: Reads stock=1, passes check
// Request 2: Reads stock=1, passes check
// Request 1: Updates to stock=0
// Request 2: Updates to stock=0
// Result: Sold 2 items but stock went 1→0 instead of 1→-1
```

**Solution:** Use database transactions + row-level locking.

```typescript
// ✅ SAFE (atomic transaction)
async buyProduct(userId: number, productId: number) {
  // Start transaction
  const result = await db.$transaction(async (trx) => {
    const product = await trx.product.findUniqueOrThrow(
      { where: { id: productId } },
      { rejectOnNotFound: true }
    );

    if (product.stock < 1) throw new OutOfStockException();

    // Update within transaction (locks row)
    return trx.product.update({
      where: { id: productId },
      data: { stock: { decrement: 1 } },  // Atomic decrement
    });
  });
  // If transaction fails, both operations roll back

  return result;
}

// Now:
// Request 1: Locks row, reads stock=1, updates to stock=0, releases
// Request 2: Waits for lock, reads stock=0, throws OutOfStockException
// Result: Correctly sold 1 item, second request rejected
```

#### 2. Off-by-One Errors (Pagination)

**Scenario:** Page 1 shows items 0-9, but you're using `offset: page * size`

```typescript
// ❌ WRONG
async getProducts(page: number, size: number) {
  // Page 1: offset = 1 * 10 = 10 (skips first item!)
  // Page 2: offset = 2 * 10 = 20
  return db.product.findMany({
    skip: page * size,
    take: size,
  });
}

// Usage:
GET /products?page=1  // Expect first 10, get items 10-19 instead

// ✅ CORRECT
async getProducts(page: number, size: number) {
  // Page 1 (0-indexed): offset = 0 * 10 = 0 ✓
  // Page 2: offset = 1 * 10 = 10 ✓
  return db.product.findMany({
    skip: (page - 1) * size,  // Convert 1-indexed to 0-indexed
    take: size,
  });
}
```

#### 3. Null/Undefined Confusion

```typescript
// ❌ WRONG
const discount = user.discountCode ?? null;
// If discountCode is undefined, this becomes null
// But you probably wanted to check "was a code provided?"

// ✅ CORRECT: Use nullish coalescing correctly
const discountCode = user.discountCode ?? 'NONE';
// If discountCode is undefined/null, default to 'NONE'

// Or explicitly check existence in TypeScript
if (user.discountCode) {
  applyDiscount(user.discountCode);
}
```

#### 4. Floating Point Precision (Financial Calculations)

```typescript
// ❌ NEVER DO THIS WITH MONEY
const price = 0.1 + 0.2;  // 0.30000000000000004 (not 0.3!)

// ✅ USE INTEGERS (store as cents)
const priceCents = 10 + 20;  // 30 cents ✓

// When displaying: priceCents / 100 = $0.30
// This is universal in fintech (Stripe, PayPal all use cents internally)
```

#### 5. Timezone Hell (Always Use UTC)

```typescript
// ❌ WRONG: Stores local time,breaks when you deploy to different tz
const created = new Date();  // 2024-01-15 10:30:00 (but what tz? 🤷)
await db.insert({ created });

// ✅ CORRECT: Always UTC in database, convert on display
const created = new Date().toISOString();  // 2024-01-15T15:30:00Z (always UTC)
await db.insert({ created });

// In controller: Convert to user's locale for display
const userTime = created.toLocaleString('en-US', { timeZone: 'America/New_York' });
```

### Production Gotchas: What Happens at 3 AM

#### 1. Database Connection Exhaustion

```typescript
// ❌ CONNECTION LEAK: Creates connection but never closes
app.get('/users', async (req, res) => {
  const connection = await pool.getConnection();
  const users = await connection.query('SELECT * FROM users');
  // Forgot to release connection!
  res.send(users);
});

// After 100 requests, pool exhausted, all requests hang

// ✅ SAFE: Always release
app.get('/users', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const users = await connection.query('SELECT * FROM users');
    res.send(users);
  } finally {
    connection.release();  // Always runs
  }
});

// Or use ORM which handles pooling (Prisma, TypeORM)
```

#### 2. Memory Leaks from Unclosed Resources

```typescript
// ❌ LEAK: Event listeners accumulate without cleanup
const server = express();
server.on('request', () => {
  emitter.on('data', handleData);  // New listener each request
  // Old listeners never removed, memory grows
});

// ✅ FIX: Remove listeners
const handleData = () => { /* ... */ };
server.on('request', () => {
  emitter.on('data', handleData);
  response.on('finish', () => {
    emitter.off('data', handleData);  // Clean up
  });
});

// Or use circuit breaker to limit connections
```

#### 3. Stack Overflow from Unbounded Recursion

```typescript
// ❌ DANGEROUS: No limit
async function processTree(node) {
  for (const child of node.children) {
    await processTree(child);  // 1000-level deep tree → stack overflow
  }
}

// ✅ SAFE: Iterative approach (or limit recursion depth)
async function processTree(node) {
  const queue = [node];

  while (queue.length > 0) {
    const current = queue.shift();
    // Process current
    queue.push(...current.children);
  }
}
```

#### 4. Cascading Failures (Failure Cascade)

```
Service A calls Service B calls Service C

Service C is slow (15 second timeout)
  ↓
Service B stacks up requests waiting for C
  ↓
Service B runs out of memory (too many waiting requests)
  ↓
Service B crashes
  ↓
Service A gets errors from B
  ↓
If A doesn't handle it, entire system cascades down

Solution: Circuit breaker + timeout
```

```typescript
const circuitBreaker = new CircuitBreaker(
  () => serviceB.call(),
  { timeout: 5000 }  // Kill after 5s, don't wait 15s
);

try {
  await circuitBreaker.call();
} catch (err) {
  // Return cached data instead of crashing
  return fallbackResponse;
}
```

### Production Readiness Checklist

Before shipping Phase 1, ensure:

**Code Quality:**
- [ ] No `console.log()` (use Logger)
- [ ] No hardcoded values (use environment variables)
- [ ] No `any` type without comment
- [ ] All imports resolve (no unused imports)
- [ ] All tests pass
- [ ] No security warnings in npm audit

**Deployment Readiness:**
- [ ] `.env.example` has all required vars (for team onboarding)
- [ ] `docker-compose.yml` starts all services
- [ ] Health check endpoint responds 200
- [ ] Database migrations run automatically
- [ ] Logs go to structured logger, not console
- [ ] Errors reported to monitoring service (Sentry/DataDog)

**Documentation:**
- [ ] README.md has setup instructions
- [ ] API endpoints documented (Swagger/OpenAPI)
- [ ] Environment variables documented
- [ ] Dev vs Prod differences explained

**Monitoring:**
- [ ] Can see errors in real-time
- [ ] Can see database query times
- [ ] Can see API response times
- [ ] Can see memory usage

**Database:**
- [ ] Auto-backup configured
- [ ] Point-in-time recovery possible
- [ ] Connection pooling configured
- [ ] Indexes on frequently queried columns

### System Design Thinking: Before You Code a Feature

When assigned a feature, think through:

1. **Happy Path:** User does everything right
   - What data needs to flow through system?
   - What database queries run?

2. **Sad Path:** Things go wrong
   - What if database is down during registration?
   - What if payment gateway times out?
   - What if user's internet drops mid-upload?

3. **Scale Path:** Success!
   - Works for 1 user, works for 1 million?
   - Database query: Full table scan (O(n)) vs indexed (O(log n))?
   - Memory: Storing 1GB array in RAM?

4. **Security Path:** Prevent attacks
   - Can unauthenticated user access this endpoint?
   - Can user see other user's data?
   - Can user input SQL injection?
   - Can user crash server with huge input?

5. **Monitoring Path:** Can you debug it?
   - What should be logged?
   - Can you reproduce the bug if user reports it?
   - How will you know if it fails in production?

**Template Before Coding:**
```typescript
// FAQ: What could go wrong with getUserOrders?

// Q: Database is down?
// A: Catch PrismaClientInitializationError, return 503

// Q: User has 10 million orders?
// A: Paginate, load top 50, lazy-load rest

// Q: User asks for wrong user ID?
// A: Check authorization, return 403 not 404

// Q: Order data is corrupted?
// A: Log warning, return best-effort data with error flag

// Q: How long should this take max?
// A: 5 seconds, if > 5s return timeout error
```

📚 **External Resources:**
- [The Twelve-Factor App](https://12factor.net/) — Production application principles
- [Building Microservices (book)](https://www.amazon.com/Building-Microservices-Designing-Fine-Grained-Systems/dp/1491950358) — Common failures in distributed systems
- [Designing Data-Intensive Applications (book)](https://www.amazon.com/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321) — Deep dives on scaling challenges

---

### Phase 1: Configuration & Fail-Fast (DONE ✅)

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

---

# 14-Day Full-Stack Execution & Learning Pipeline

> **This section is the execution engine.** It references concepts already taught above in plan.md and applies them to building Coffee Logic end-to-end. Each phase builds a real, testable part of the product. Concepts are **applied**, not re-explained — see the referenced section for deep understanding.

---

## Pre-Phase: Codebase Analysis & SRS Gap Mapping

> **Mandatory before writing any code.** Understand what exists, what's missing, and what the SRS demands.

### Current Implementation Inventory


| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **NestJS API scaffold** | ✅ Built | `apps/api/` | AppModule, main.ts with ValidationPipe, CORS, ThrottlerGuard |
| **Next.js Frontend** | ✅ Built | `apps/web/` | App router, admin + auth route groups, TanStack Query |
| **Prisma Schema** | ✅ Built | `prisma/schema.prisma` | User, Product, ProductVariant, Batch, Inventory, Order, OrderItem, Subscription, SubscriptionItem, WebhookLog, AuditEvent — all models defined |
| **Auth Module** | ✅ Built | `apps/api/src/auth/` | JWT strategy, login with `UnauthorizedException`, `@Throttle` on login |
| **User Module** | ✅ Built | `apps/api/src/user/` | CRUD with password hashing, guards + `@Roles('admin')` |
| **Products Module** | ✅ Built | `apps/api/src/products/` + `product/` | Admin CRUD with filtering (name, roast, grind, origin, caffeine, process) |
| **Inventory Module** | 🟡 Partial | `apps/api/src/inventory/` | Only `freshness.util.ts` — no module, service, controller, or tests |
| **Config Validation** | ✅ Built | `apps/api/src/config/env.config.ts` | Zod schema validates JWT_SECRET, DATABASE_URL, PORT, NODE_ENV |
| **Global Prisma** | ✅ Built | `apps/api/src/prisma/` | `@Global()` singleton with `onModuleInit`/`onModuleDestroy` |
| **Exception Filter** | ❌ Missing | — | No `common/filters/` directory exists, no global exception filter |
| **Rate Limiting** | ✅ Built | `app.module.ts` + `main.ts` | ThrottlerModule + manual IP-based middleware on `/auth/login` |
| **RolesGuard + @Roles** | ✅ Built | `apps/api/src/auth/guard/roles.guard.ts` | Working with reflector, checks `user.role` against `@Roles()` |
| **JWT Auth Guard** | ✅ Built | `apps/api/src/auth/guard/jwt-auth.guard.ts` | Passport JWT strategy |
| **Validation Pipe** | ✅ Built | `main.ts` | Global `ValidationPipe({ whitelist: true, transform: true })` |
| **CORS** | ✅ Built | `main.ts` | Configured for localhost:3000, 3001, 5173 |
| **Frontend API Client** | ✅ Built | `apps/web/src/lib/http.ts` | Typed `requestJson<T>` with `HttpError`, auth headers, timeout |
| **Frontend Hooks** | ✅ Built | `apps/web/src/hooks/use-products.ts` | TanStack Query mutations for CRUD |
| **Admin Dashboard** | ✅ Built | `apps/web/src/components/` | product-dashboard, product-edit-modal, admin-shell, pagination, skeleton, toast |
| **Login Page** | ✅ Built | `apps/web/src/app/(auth)/login/` | Working login with session management |
| **Frontend Types** | ✅ Built | `apps/web/src/lib/types.ts` | Product, AuthSession, UserRole, UserRecord typed |
| **Batch Module** | ❌ Missing | — | Schema exists but no NestJS module/service/controller |
| **Checkout Module** | ❌ Missing | — | Schema exists but no Stripe integration or service |
| **Subscription Module** | ❌ Missing | — | Schema exists but no service or controller |
| **Order Module** | ❌ Missing | — | Schema exists but no service or controller |
| **Storefront (FE)** | ❌ Missing | — | No customer-facing product browsing |
| **Audit Log Service** | ❌ Missing | — | Schema exists but no service or interceptor |
| **Docker/CI-CD** | ❌ Missing | — | No docker-compose.yml, no Dockerfiles, no GitHub Actions |

### SRS → Implementation Gap Analysis

| SRS Requirement | Status | What Exists | What's Missing | Phase |
|----------------|--------|-------------|----------------|-------|
| **FR-SF-001** Product browsing | ❌ | Admin-only product list | Public API endpoint + storefront pages | Phase 3 |
| **FR-SF-002** Faceted filtering | 🟡 | Backend filtering exists (admin) | Public API + frontend filter UI for customers | Phase 3 |
| **FR-SF-003** Product detail pages | ❌ | — | SSR product detail route + sensory profile display | Phase 3 |
| **FR-Subs-001** Purchase mode toggle | ❌ | Schema: Subscription model | Service + controller + frontend toggle | Phase 4 |
| **FR-Subs-002** Delivery cadence | ❌ | Schema: `cadenceDays` field | Service validation + UI selection | Phase 4 |
| **FR-Subs-003** Subscription management | ❌ | Schema: status enum | Stripe Billing API + My Account portal | Phase 4 |
| **FR-CO-001** Checkout session | ❌ | Schema: Order model | Stripe Checkout Sessions + service | Phase 4 |
| **FR-CO-003** Stripe webhooks | ❌ | Schema: WebhookLog model | Webhook controller + signature validation | Phase 4 |
| **FR-CO-007** Idempotency keys | ❌ | Schema: `eventId @unique` on WebhookLog | Idempotency key generation + checking | Phase 4 |
| **FR-Inv-001** Batch tracking | ❌ | Schema: Batch model | Batch NestJS module/service/controller | Phase 2 |
| **FR-Inv-002** Peak freshness | 🟡 | `freshness.util.ts` (basic, no `now` injection) | Refactor to pure function + integrate into API responses | Phase 2 |
| **FR-Inv-003** Quantity tracking | ❌ | Schema: Inventory model with onHand/reserved/available | Inventory NestJS module/service with transactions | Phase 2 |
| **FR-Inv-006** Inventory reservation | ❌ | — | Reserve → payment → confirm/release flow | Phase 4 |
| **FR-Admin-001** Product CRUD | ✅ Built | Full admin CRUD with filtering | — | — |
| **FR-Admin-002** Batch management | ❌ | Schema exists | Admin batch creation + listing UI | Phase 2 |
| **FR-Admin-003** Inventory adjustment | ❌ | Schema exists | Admin inventory control + audit logging | Phase 2 |
| **FR-Admin-006** Audit log view | ❌ | Schema: AuditEvent model | Audit log service + interceptor + admin view | Phase 5 |
| **FR-Admin-007** RBAC | ✅ Built | RolesGuard + @Roles decorator + UserRole enum (viewer/operator/manager/admin) | Fine-grained permission matrix per role | Phase 5 |
| **FR-Auth-001** Sign-in | ✅ Built | JWT login with UnauthorizedException | — | — |
| **FR-Auth-003** Password reset | ❌ | — | Token generation + email sending | Phase 5 |
| **FR-Auth-004** Address book | ❌ | Schema: `defaultAddress` field on User | Address entity + CRUD | Phase 4 |


### Priority Matrix (Impact × Effort)

```
HIGH IMPACT
    │
    │  ★ Storefront (FR-SF)     ★ Checkout (FR-CO)
    │  ★ Inventory (FR-Inv)     ★ Subscriptions (FR-Subs)
    │
    │  ○ Audit Logs (FR-Admin-006)  ○ Password Reset (FR-Auth-003)
    │  ○ Address Book (FR-Auth-004)
    │
LOW IMPACT
    └──────────────────────────────────────────────────
         LOW EFFORT                        HIGH EFFORT
```

**Conclusion:** Build inventory (backbone) → storefront (customer value) → checkout (revenue) → subscriptions (recurring revenue) → hardening (production).

---

## Package Management & Tooling: Deep Understanding

> **Referenced throughout all phases.** Every phase introduces or uses tooling concepts. This section is the reference.

### Package Manager: pnpm (This Project)

**What it is:** A fast, disk-space efficient package manager for Node.js. Alternative to npm and yarn.

**Why pnpm for Coffee Logic:**
- **Monorepo support:** `pnpm-workspace.yaml` defines `apps/api` and `apps/web` as workspaces
- **Disk efficiency:** Uses content-addressable storage (symlinks instead of copies) — saves GB on large monorepos
- **Strictness:** By default, packages can only access declared dependencies (prevents phantom deps)

**How it works internally:**
```
pnpm install
    ↓
1. Resolve dependency tree (read package.json + lockfile)
    ↓
2. Download packages to global content-addressable store
   (~/.pnpm-store/v3/)
    ↓
3. Create hard links from store to node_modules/.pnpm/
    ↓
4. Create symlinks from node_modules/.pnpm/ to node_modules/
    ↓
Result: node_modules is a virtual filesystem of symlinks
        Actual bytes stored ONCE globally
```

**Key commands for this project:**
```bash
# Install dependency in API workspace
pnpm -C apps/api add <package>

# Install dev dependency in web workspace
pnpm -C apps/web add -D <package>

# Run script in specific workspace
pnpm -C apps/api start:dev
pnpm -C apps/web dev

# Install all workspaces
pnpm install

# Run command across all workspaces
pnpm -r run build
```

**Lock file (`pnpm-lock.yaml`):**
- **Why it exists:** Guarantees identical dependency versions across all machines and CI
- **What breaks if ignored:** Developer A has `lodash@4.17.20`, Developer B gets `lodash@4.17.21` — subtle behavior differences cause bugs that only appear in production
- **Rule:** ALWAYS commit `pnpm-lock.yaml`. NEVER delete it.

**Common failure modes:**
- **"Module not found":** Phantom dependency — you're importing a package that's a sub-dependency. Fix: explicitly add it to `package.json`
- **"ERR_PNPM_PEER_DEP_ISSUES":** Peer dependency conflict. Fix: `pnpm install --strict-peer-dependencies=false` (temporary) or resolve versions
- **"Integrity checksum failed":** Corrupted store. Fix: `pnpm store prune && pnpm install`

### Dependencies vs DevDependencies

```jsonc
// package.json
{
  "dependencies": {
    // REQUIRED in production (shipped with your app)
    "@nestjs/core": "^10.0.0",    // Framework runtime
    "@prisma/client": "^5.0.0",   // Database client
    "bcrypt": "^5.1.0",           // Password hashing
    "zod": "^3.22.0"              // Runtime validation
  },
  "devDependencies": {
    // ONLY for development/build (NOT shipped)
    "@types/node": "^20.0.0",     // TypeScript type definitions
    "jest": "^29.0.0",            // Test runner
    "eslint": "^8.0.0",           // Code linting
    "prisma": "^5.0.0",           // CLI tool (generates client)
    "typescript": "^5.0.0"        // Compiler
  }
}
```

**Critical distinction:**
- `dependencies` → installed in production (`pnpm install --prod`)
- `devDependencies` → skipped in production
- **Failure case:** Putting `typescript` in `dependencies` bloats your Docker image by 50MB for no reason
- **Failure case:** Putting `@prisma/client` in `devDependencies` → production app crashes with "Cannot find module @prisma/client"

### SemVer (Semantic Versioning)

```
    1  .  2  .  3
    │     │     │
  MAJOR MINOR PATCH
    │     │     │
    │     │     └─ Bug fixes (safe to update)
    │     └─────── New features, backwards compatible (usually safe)
    └───────────── Breaking changes (READ CHANGELOG before updating)
```

**Version ranges in package.json:**
```jsonc
{
  "dependencies": {
    "exact": "1.2.3",           // Exactly this version (safest, most restrictive)
    "caret": "^1.2.3",          // >=1.2.3 <2.0.0 (allows minor + patch updates)
    "tilde": "~1.2.3",          // >=1.2.3 <1.3.0 (allows only patch updates)
    "wildcard": "*"             // Any version (NEVER do this in production)
  }
}
```

**Risk:** Using `^` means `pnpm install` on a new machine might get `1.3.0` which has a subtle behavior change. That's why the **lock file** exists — it pins exact versions.

### Scripts (package.json)

```jsonc
// apps/api/package.json
{
  "scripts": {
    "build": "nest build",              // Compile TypeScript → JavaScript
    "start": "nest start",              // Run compiled JS (production)
    "start:dev": "nest start --watch",  // Watch mode + auto-reload (development)
    "start:debug": "nest start --debug --watch",  // + Node.js debugger
    "test": "jest",                     // Run unit tests
    "test:watch": "jest --watch",       // Re-run tests on file change
    "test:cov": "jest --coverage",      // + Coverage report
    "test:e2e": "jest --config ./test/jest-e2e.json",  // Integration tests
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",  // Check code style
    "format": "prettier --write \"src/**/*.ts\""        // Auto-format code
  }
}
```

**Why scripts matter:** They standardize workflows. New developer runs `pnpm -C apps/api start:dev` — identical experience to every other developer. No "it works on my machine."

### TypeScript Compiler (tsc) — The Build Pipeline

```
tsconfig.json → tsc → JavaScript output
    │
    ├─ "strict": true         ← Enables all type checks
    ├─ "target": "ES2021"     ← Output JS version
    ├─ "module": "commonjs"   ← Module system (Node.js uses CJS)
    ├─ "outDir": "./dist"     ← Where compiled JS goes
    ├─ "declaration": true    ← Generate .d.ts type definitions
    └─ "sourceMap": true      ← Map errors to .ts line numbers
```

**What breaks if misconfigured:**
- `"strict": false` → TypeScript allows `any` everywhere → defeats the entire type system
- Wrong `"target"` → Using `Promise.allSettled()` but targeting ES2015 → compile error
- Wrong `"paths"` → `import { PrismaService } from 'src/prisma/...'` fails

### ESLint + Prettier (Code Quality)

```
ESLint:     "Is this code correct? Does it follow rules?"
Prettier:   "Is this code formatted consistently?"

Both run:   On save (VS Code), on commit (husky), in CI (GitHub Actions)
```

**Why both:** ESLint catches logical issues (`no-unused-vars`, `no-implicit-any`). Prettier handles formatting (tabs vs spaces, line length). They solve different problems.

📚 **External Resources:**
- [pnpm Documentation](https://pnpm.io/)
- [npm vs yarn vs pnpm](https://blog.logrocket.com/javascript-package-managers-compared/)
- [SemVer Specification](https://semver.org/)
- [TypeScript tsconfig Reference](https://www.typescriptlang.org/tsconfig)

---

## Execution Schedule Overview (14 Days)

| Phase | Days | Focus | SRS Coverage | Deliverable |
|-------|------|-------|--------------|-------------|
| **Phase 1** | Days 1–2 | Foundation Hardening | Infrastructure | Fix strict TS, add exception filter, harden main.ts |
| **Phase 2** | Days 3–5 | Core Backend (Inventory + Batch) | FR-Inv-001→006, FR-Admin-002→003 | Working inventory system with tests |
| **Phase 3** | Days 6–8 | Storefront (Frontend + Public API) | FR-SF-001→003 | Customer-facing product browsing |
| **Phase 4** | Days 9–11 | Checkout + Subscriptions | FR-CO-001→007, FR-Subs-001→004 | Payment flow with Stripe |
| **Phase 5** | Days 12–13 | Robustness + Auth Hardening | FR-Auth-003→006, FR-Admin-006→007 | Audit logs, RBAC, password reset |
| **Phase 6** | Day 14 | Production Hardening | NFR-Perf, NFR-Avail, NFR-Sec | Docker, CI/CD, monitoring, deployment |

### Phase Flow Rules (Non-Negotiable)

1. **Each phase produces testable, working output** — no "setup-only" phases
2. **Validation gates are hard stops** — phase is rejected if gate fails
3. **Concepts from plan.md are applied, not re-explained** — see referenced section
4. **Frontend and backend are built together** — no "frontend later" mentality
5. **Production concerns start in Phase 1** — error handling, logging, validation from day one

---

## Phase 1: Foundation + Architecture Setup (Days 1–2)

**Phase Objective:** Harden the existing project architecture — enforce TypeScript strict mode (currently `noImplicitAny: false`), create the missing global exception filter, add `setGlobalPrefix('api')` and `forbidNonWhitelisted` to the validation pipe, and create the missing `UpdateProductDto`.

**SRS Mapping:** Infrastructure hardening for all FR-* requirements. The foundation EXISTS but has gaps that will cause production issues.

**Already Built (Verify Only, Do Not Rebuild):**
- ✅ Zod environment validation (`env.config.ts`)
- ✅ Global PrismaModule (`@Global()` singleton)
- ✅ Rate limiting (ThrottlerModule + manual middleware)
- ✅ CORS configuration
- ✅ ValidationPipe (`whitelist: true`, `transform: true`)
- ✅ Auth login with `UnauthorizedException`
- ✅ RolesGuard + `@Roles` decorator
- ✅ JwtAuthGuard + Passport JWT strategy

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| TypeScript strict mode | "Core Type System Concepts → Strict Mode" (line ~762) | **FIX:** `tsconfig.json` has `noImplicitAny: false` — must change to `strict: true` |
| Exception filters | "Phase 2.2: Global Exception Filter" (line ~3702) | **CREATE:** No exception filter exists — build one |
| PartialType DTOs | "Phase 2.3: UpdateProductDto" (line ~3842) | **CREATE:** PATCH uses `CreateProductDto` — need `UpdateProductDto` |
| NestJS Request Pipeline | "The NestJS Request Pipeline" (line ~1341) | **VERIFY:** middleware → guard → pipe → controller → filter flow |
| Separation of Concerns | "Pattern 2: Separation of Concerns" (line ~2288) | **VERIFY:** Controller → Service → Prisma layers |

### Implementation Steps

---

#### Step 1.1: Fix TypeScript Strict Mode (Currently Broken)

**1. Action (What to Build):**
The API `tsconfig.json` currently has `"noImplicitAny": false` and `"strictBindCallApply": false` — this defeats TypeScript's type safety. Change to `"strict": true` and fix all resulting compilation errors.

**2. How to Implement:**
- File: `apps/api/tsconfig.json` — replace individual flags with `"strict": true`
- Remove: `"noImplicitAny": false`, `"strictBindCallApply": false`, `"noFallthroughCasesInSwitch": false`
- Add: `"strict": true`
- Run `pnpm -C apps/api build` — expect type errors
- Fix each error (add types, use `unknown` instead of implicit `any`, add null checks)
- Known issues to fix:
  - `auth.service.ts` line 20: return type `Promise<{ code: number; ... }>` needs proper typing
  - `user.service.ts`: `productAttribute` type should be a proper interface
  - `product.service.ts` line 11: `productAttribute` should use PascalCase + interface
  - Ensure `freshness.util.ts` has proper export and removes unused `da` import from zod

**3. Concept Mapping (plan.md Reference):**
- **TypeScript Strict Mode** → Section "Core Type System Concepts → Strict Mode" (line ~762)
- `strict: true` enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`

**4. Explanation (Why This Is Done This Way):**
With `noImplicitAny: false`, function parameters without type annotations default to `any`. This means a caller can pass a number where a string is expected — and TypeScript won't catch it. The bug surfaces at runtime in production. We must fix this before writing ANY new code.

**5. Related Concepts:**
- Type inference (line ~744) — TypeScript infers types when possible
- Type narrowing (line ~783) — Runtime checks that refine types

**6. Learning Resource:**
- [TypeScript `strict` mode explained](https://www.typescriptlang.org/tsconfig#strict)

**7. Common Mistakes & Failures:**
- **Mistake:** Using `any` to silence errors → defeats the purpose. Use `unknown` + type narrowing
- **Mistake:** Setting `strict: false` to "fix" errors → hides bugs that crash in production
- **Why it fails:** `noImplicitAny: false` allows untyped parameters → wrong type passed → runtime TypeError

**8. Production Consideration:**
- Fix ALL compilation errors before proceeding — broken builds must never reach CI

---

#### Step 1.2: Create Global Exception Filter (Currently Missing)

**1. Action (What to Build):**
No exception filter exists in the codebase (`common/filters/` directory is empty). Create the global exception filter that catches ALL thrown exceptions and returns consistent JSON responses.

**2. How to Implement:**
- Create `apps/api/src/common/filters/http-exception.filter.ts`
- Catch: `HttpException` → proper HTTP status + message
- Catch: `PrismaClientKnownRequestError` P2002 → HTTP 409 Conflict
- Catch: `PrismaClientKnownRequestError` P2025 → HTTP 404 Not Found
- Catch: generic `Error` → HTTP 500 with sanitized message (don't leak stack traces)
- Register in `main.ts`: `app.useGlobalFilters(new HttpExceptionFilter())`
- See full implementation in plan.md "Phase 2.2: Global Exception Filter" (line ~3702)

**3. Concept Mapping (plan.md Reference):**
- **Exception Filters** → "Phase 2.2: Global Exception Filter" (line ~3702) — full code provided there
- **NestJS Pipeline** → line ~1341 — filters are the LAST stop in the pipeline

**4. Explanation (Why This Is Done This Way):**
Without an exception filter, unhandled errors return HTML error pages (NestJS default) or leak internal details. The filter ensures EVERY response — success or failure — is consistent JSON: `{ statusCode, message, error, timestamp, path }`.

**5. Related Concepts:**
- Prisma error codes (P2002 = unique violation, P2025 = not found)
- HTTP status codes (401, 404, 409, 500)

**6. Learning Resource:**
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)

**7. Common Mistakes & Failures:**
- **Mistake:** Logging full stack traces to client → security risk (leaks internals)
- **Mistake:** Not catching Prisma errors → P2002 becomes generic 500 instead of useful 409
- **Why it fails:** Without filter, some exceptions return HTML → frontend `JSON.parse()` crashes

**8. Production Consideration:**
- Log full error details server-side (for debugging), return sanitized message to client
- Structured logging: `[POST] /auth/login → 401 Invalid email or password`

---

#### Step 1.3: Create UpdateProductDto (Currently Missing)

**1. Action (What to Build):**
The PATCH endpoint at `products.controller.ts` line 58 uses `CreateProductDto` for updates — meaning all fields are required for partial updates. Create `UpdateProductDto` using `PartialType()`.

**2. How to Implement:**
- Install: `pnpm -C apps/api add @nestjs/mapped-types` (if not present)
- Create `apps/api/src/products/dto/update-product.dto.ts`
- Use `PartialType(CreateProductDto)` to make all fields optional
- Update `products.controller.ts` to use `UpdateProductDto` for `@Patch(':id')`
- See full implementation in plan.md "Phase 2.3: UpdateProductDto" (line ~3842)

**3. Concept Mapping (plan.md Reference):**
- **PartialType** → "Phase 2.3: UpdateProductDto" (line ~3842)
- **REST semantics** → PUT = full replacement, PATCH = partial update

**4. Explanation (Why This Is Done This Way):**
Without `PartialType`, sending `{ "grind": "fine" }` to PATCH fails validation because `name`, `roastLevel`, etc. are required by `CreateProductDto`. `PartialType` copies all validators but makes every field optional.

**5. Related Concepts:**
- Mapped types in TypeScript — `Partial<T>` makes all properties optional
- REST PATCH semantics — only send fields you want to change

**6. Learning Resource:**
- [NestJS Mapped Types](https://docs.nestjs.com/techniques/serialization#partial-type)

**7. Common Mistakes & Failures:**
- **Mistake:** Reusing CreateProductDto for PATCH → validation rejects partial updates
- **Why it fails:** Client sends one field → validation requires all fields → 400 Bad Request

**8. Production Consideration:**
- Validators from CreateProductDto are preserved (e.g., min length) but each field is optional

---

#### Step 1.4: Harden main.ts (Add Missing Configuration)

**1. Action (What to Build):**
The existing `main.ts` is missing: `setGlobalPrefix('api')`, `forbidNonWhitelisted: true` on ValidationPipe, global exception filter registration, and ConfigService-based port reading. Also, the manual rate limiting middleware (lines 7-55) should be removed since ThrottlerModule + `@Throttle` already handle this.

**2. How to Implement:**
- ADD: `app.setGlobalPrefix('api')` — standardizes all routes under `/api/*`
- ADD: `forbidNonWhitelisted: true` to ValidationPipe — rejects unknown fields
- ADD: `app.useGlobalFilters(new HttpExceptionFilter())` — registers the new filter
- REMOVE: Manual rate limiting middleware (lines 7-55) — replaced by ThrottlerModule
- ADD: Use `ConfigService` for port instead of `process.env.PORT`

**3. Concept Mapping (plan.md Reference):**
- **NestJS Request Pipeline** → line ~1341
- **Validation at system boundaries** → line ~1869

**4. Explanation (Why This Is Done This Way):**
`forbidNonWhitelisted: true` prevents mass assignment attacks — clients can't inject unexpected fields. `setGlobalPrefix('api')` makes the API RESTful and consistent. Removing manual rate limiting eliminates code duplication (ThrottlerModule already does this better).

**5. Related Concepts:**
- Mass assignment protection — `forbidNonWhitelisted` rejects unknown properties
- DRY principle — don't duplicate rate limiting logic

**6. Learning Resource:**
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)

**7. Common Mistakes & Failures:**
- **Mistake:** Keeping both manual middleware AND ThrottlerModule → double rate limiting
- **Mistake:** Not using `setGlobalPrefix` → inconsistent route structure
- **Why it fails:** Missing `forbidNonWhitelisted` → attacker injects `role: "admin"` in registration body

**8. Production Consideration:**
- Stripe webhooks will need raw body parsing → add exception for webhook route before validation pipe

---

### Phase 1 Validation Gate (Hard Stop)

**Phase is ONLY complete if ALL pass:**

- [ ] `apps/api/tsconfig.json` has `"strict": true` (not individual flags)
- [ ] `pnpm -C apps/api build` compiles with zero errors under strict mode
- [ ] `apps/api/src/common/filters/http-exception.filter.ts` exists and is registered globally
- [ ] Sending invalid JSON to any endpoint returns `{ statusCode, message, error, timestamp, path }`
- [ ] `UpdateProductDto` exists and PATCH accepts partial updates
- [ ] Manual rate limiting middleware removed from `main.ts` (ThrottlerModule handles it)
- [ ] `forbidNonWhitelisted: true` set on ValidationPipe
- [ ] API routes use `/api/` prefix
- [ ] `freshness.util.ts` has proper export and no unused imports

**If ANY gate fails → fix before proceeding to Phase 2.**

### Phase 1 Review Loop

After completing all steps:

1. **Self-review:** Run `pnpm -C apps/api lint` — fix all warnings
2. **Concept verification:** Can you explain why `forbidNonWhitelisted` prevents mass assignment?
3. **Commit:** `git commit -m "fix: enforce strict TypeScript, add exception filter, harden main.ts"`


---

## Phase 2: Core Backend — Inventory & Batch System (Days 3–5)

**Phase Objective:** Build the complete inventory and batch management backend — the operational backbone of Coffee Logic. This phase delivers batch tracking, freshness computation in API responses, atomic inventory reservation/release, and admin batch management endpoints.

**SRS Mapping:**
- **FR-Inv-001** → Batch recording with roast date, batch ID, product association
- **FR-Inv-002** → Peak freshness window computation (extending Phase 3.1 pure function into API)
- **FR-Inv-003** → On-hand and reserved quantity tracking per batch
- **FR-Inv-004** → Low-stock alert triggers
- **FR-Inv-005** → Product visibility based on freshness + availability
- **FR-Admin-002** → Admin batch creation and management
- **FR-Admin-003** → Inventory adjustment with audit logging

**Already Built (Do Not Rebuild):**
- ✅ Prisma schema: `Batch` model (id, productId, batchCode, roastDate, expiresAt, product relation, inventory relation)
- ✅ Prisma schema: `Inventory` model (id, batchId, onHand, reserved, available, updatedAt)
- ✅ `freshness.util.ts` — basic implementation exists (needs refactoring: add `now` parameter for testability, add proper export, remove unused import)
- ✅ `RolesGuard` + `@Roles` decorator — already works with `user.role` checking
- ✅ `JwtAuthGuard` — already available for protecting endpoints

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| Pure functions | "Phase 3.1: Peak Freshness (Pure Function)" (line ~4018) | `isPeakFreshness()` integrated into batch API responses |
| Prisma transactions | "Phase 3.3: Inventory Service (Atomic Transactions)" (line ~4409) | Reserve/release inventory atomically |
| Race conditions | "Edge Cases: Race Conditions" (line ~2643) | Prevent double-selling with row-level locking |
| DTO validation | "Pattern 1: DTO (Data Transfer Object)" (line ~803) | CreateBatchDto, AdjustInventoryDto |
| Generics | "Generics (Reusable Patterns)" (line ~715) | Generic paginated response type |
| Discriminated unions | "Discriminated Unions (Type-Safe State)" (line ~820) | Result<T> type for service returns |
| Unit testing | "Testing Strategies" (line ~2499) | Test freshness util + inventory math |
| Guards + Roles | Phase 3.2 batch controller (line ~4328) | `@Roles('admin', 'manager')` on batch endpoints |

### Implementation Steps

---

#### Step 2.1: Create Batch Module with Full CRUD

**1. Action (What to Build):**
Implement the Batch module with controller, service, DTOs, and admin-only access. Batches track roast dates and are linked to products.

**2. How to Implement:**
- Generate module: `pnpm -C apps/api exec nest g module batch && nest g service batch && nest g controller batch`
- Create `apps/api/src/batch/dto/create-batch.dto.ts` with `@IsUUID()`, `@IsDateString()`, `@IsOptional()` validators
- Create `apps/api/src/batch/dto/update-batch.dto.ts` using `PartialType(CreateBatchDto)`
- Implement `batch.service.ts`: `createBatch()`, `getBatchesByProduct()`, `getBatchById()`, `updateBatch()`
- Implement `batch.controller.ts`: POST, GET, GET/:id, PATCH/:id — all guarded with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin', 'manager')`
- Register BatchModule in `app.module.ts`

**3. Concept Mapping (plan.md Reference):**
- **DTO validation** → "Pattern 1: DTO" (line ~803) → `@IsUUID()` ensures productId is valid UUID before hitting database
- **Guards + Roles** → Phase 3.2 existing implementation (line ~4328) → only admin/manager can manage batches
- **PartialType** → "Phase 2.3: UpdateProductDto" (line ~3842) → reuse CreateBatchDto validators for PATCH
- **Async/Await in controllers** → "Pattern 1: Controller with async method" (line ~1261)

**4. Explanation (Why This Is Done This Way):**
Batches are the physical units of coffee inventory. Each batch has a roast date (determines freshness), a product association (which coffee it is), and a quantity. By separating batches from products, we support multiple batches of the same coffee at different freshness stages — critical for FR-Inv-002 (peak window calculation).

**Alternative:** Single `stock` field on Product → simpler but loses freshness tracking, violates FR-Inv-002.
**Trade-off:** More database complexity but enables the core business differentiator (freshness-based selling).

**5. Related Concepts:**
- Separation of Concerns (line ~2288) — Batch module handles batch logic, not product logic
- NestJS module generation — CLI scaffolding matches our architecture pattern
- Async/await patterns (line ~1151) — all service methods are async for database operations

**6. Learning Resource:**
- [NestJS Providers and Services](https://docs.nestjs.com/providers)
- [class-validator Decorators](https://github.com/typestack/class-validator#validation-decorators)
- [Prisma CRUD](https://www.prisma.io/docs/concepts/components/prisma-client/crud)

**7. Common Mistakes & Failures:**
- **Mistake:** Forgetting to verify product exists before creating batch → orphaned batch with invalid `productId`
- **Mistake:** Not using `@IsDateString()` → accepting `"roastDate": "not-a-date"` → Prisma throws unclear error
- **Mistake:** Importing from absolute path `src/prisma/...` instead of relative path → build fails in different environments
- **Why it fails:** Missing guard on admin routes → any authenticated user can create/delete batches

**8. Production Consideration:**
- Logging: Log batch creation with `batchId`, `productId`, and `roastDate` for audit trail
- Error handling: `NotFoundException` when product doesn't exist, `ConflictException` for duplicate batch codes
- Edge cases: Batch with future roast date (pre-scheduling) — should be allowed but flagged in responses

---

#### Step 2.2: Integrate Freshness Computation into API Responses

**1. Action (What to Build):**
Extend batch API responses to include computed freshness data using the existing `isPeakFreshness()` pure function. Every batch response should include `isPeak`, `daysPostRoast`, `peakStart`, and `peakEnd`.

**2. How to Implement:**
```typescript
// apps/api/src/batch/batch.service.ts
import { isPeakFreshness, FreshnessResult } from '../inventory/freshness.util';

interface BatchWithFreshness {
  // ... batch fields from Prisma
  freshness: FreshnessResult;
}

async getBatchById(id: string): Promise<BatchWithFreshness> {
  const batch = await this.prisma.batch.findUniqueOrThrow({ where: { id } });
  const freshness = isPeakFreshness(batch.roastDate);
  return { ...batch, freshness };
}

async getBatchesByProduct(productId: string): Promise<BatchWithFreshness[]> {
  const batches = await this.prisma.batch.findMany({ where: { productId } });
  return batches.map(batch => ({
    ...batch,
    freshness: isPeakFreshness(batch.roastDate),
  }));
}
```

**3. Concept Mapping (plan.md Reference):**
- **Pure functions** → "Phase 3.1: Peak Freshness" (line ~4018) → `isPeakFreshness()` is already tested
- **TypeScript interfaces** → "Interfaces vs Types" (line ~693) → `BatchWithFreshness` extends Prisma type
- **Type inference** → (line ~744) → TypeScript infers return types from spread operator

**4. Explanation (Why This Is Done This Way):**
Freshness is computed at query time, not stored in the database. This ensures freshness is always accurate (no stale `isPeak` field that needs a cron job to update). The pure function has zero side effects — it takes a date and returns a result.

**Alternative:** Store `isPeak` in database + run daily cron → simpler queries but requires scheduled job, risk of stale data.
**Trade-off:** Slightly more CPU per request (negligible — date math is microseconds) but always accurate.

**5. Related Concepts:**
- Computed properties vs stored properties — a fundamental architectural choice
- Event loop (line ~978) — date math is synchronous CPU but trivially fast, won't block
- Graceful degradation (line ~1770) — if freshness computation fails, still return batch data

**6. Learning Resource:**
- [JavaScript Date API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Prisma: Extending results](https://www.prisma.io/docs/concepts/components/prisma-client/computed-fields)

**7. Common Mistakes & Failures:**
- **Mistake:** Storing computed freshness in DB → goes stale overnight → customers see "peak" on stale coffee
- **Mistake:** Not passing `new Date()` (using default) → tests become time-dependent, fail at midnight
- **Mistake:** Forgetting timezone conversion → roast date stored as local time, compared as UTC → off-by-one day
- **Why it fails:** Timezone inconsistency between database and JavaScript → `daysPostRoast` calculation is wrong

**8. Production Consideration:**
- Logging: Log freshness results for batches approaching end of peak window (alerting opportunity)
- Error handling: If `roastDate` is null/invalid, return `isPeak: false` with `daysPostRoast: -1` (defensive)
- Edge cases: Batches roasted today (day 0) — not peak yet; batches from 2 years ago — definitely stale

---

#### Step 2.3: Implement Atomic Inventory Service

**1. Action (What to Build):**
Complete the inventory service with atomic reservation, release, and adjustment operations using Prisma transactions. This prevents race conditions when multiple users try to buy the last item simultaneously.

**2. How to Implement:**
- File: `apps/api/src/inventory/inventory.service.ts`
- Implement: `reserveInventory(batchId, quantity)` — atomic reserve within transaction
- Implement: `releaseInventory(batchId, quantity)` — atomic release (payment failed)
- Implement: `confirmInventory(batchId, quantity)` — convert reserved → sold (payment succeeded)
- Implement: `adjustInventory(batchId, adjustment, reason)` — admin manual adjustment with audit log
- Implement: `getInventoryByBatch(batchId)` — includes available calculation (onHand - reserved)
- Implement: `checkLowStock(threshold)` — returns batches below threshold (FR-Inv-004)

**3. Concept Mapping (plan.md Reference):**
- **Prisma transactions** → "Phase 3.3: Atomic Transactions" (line ~4409) → `$transaction()` for all-or-nothing
- **Race conditions** → "Edge Cases: Race Conditions" (line ~2643) → row-level locking prevents double-selling
- **Try/catch** → "Error Handling Strategy #1" (line ~1660) → wrap transaction in try/catch
- **Floating point** → "Floating Point Precision" (line ~2747) → use integers for quantities

**4. Explanation (Why This Is Done This Way):**
Inventory operations MUST be atomic. Consider: 1 item left, 2 users click "Buy" within 100ms. Without transactions, both reads show `stock: 1`, both proceed — we sell 2 items from 1 stock. With Prisma `$transaction()`, the second request waits for the first to complete, sees `stock: 0`, and correctly throws `OutOfStockException`.

**Alternative:** Optimistic locking (version field) → simpler but requires retry logic on failure.
**Trade-off:** Pessimistic locking (our approach) is slower under high contention but guarantees correctness. For a coffee shop with moderate traffic, this is ideal.

**5. Related Concepts:**
- ACID guarantees (line ~170) — Atomicity and Isolation from PostgreSQL
- Circuit breaker (line ~1808) — if database is under heavy load, circuit breaker prevents cascade
- Retry mechanisms (line ~1731) — if transaction deadlocks, retry with backoff

**6. Learning Resource:**
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [PostgreSQL Row-Level Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Designing Data-Intensive Applications: Transactions](https://dataintensive.net/)

**7. Common Mistakes & Failures:**
- **Mistake:** Checking stock OUTSIDE transaction → race condition window between check and update
- **Mistake:** Using `stock: stock - quantity` instead of `{ decrement: quantity }` → not atomic
- **Mistake:** Not releasing reservations on payment failure → ghost reservations block real purchases
- **Why it fails:** Non-atomic inventory = overselling = refunds + angry customers + reputation damage

**8. Production Consideration:**
- Logging: Log every reservation/release with `batchId`, `quantity`, `action`, `timestamp`, `userId`
- Error handling: `BadRequestException` for insufficient stock, `NotFoundException` for invalid batch
- Edge cases: Negative quantity in request → validate `quantity > 0` in DTO. Zero quantity → reject.

---

#### Step 2.4: Build Admin Inventory Management Endpoints

**1. Action (What to Build):**
Create admin endpoints for viewing inventory status, making manual adjustments (restock, write-off), and viewing low-stock alerts. All actions require admin role and produce audit logs.

**2. How to Implement:**
- File: `apps/api/src/inventory/inventory.controller.ts`
- Endpoints:
  - `GET /api/admin/inventory` — list all inventory with freshness data
  - `GET /api/admin/inventory/:batchId` — single batch inventory detail
  - `POST /api/admin/inventory/:batchId/adjust` — manual adjustment (restock/write-off)
  - `GET /api/admin/inventory/alerts/low-stock` — batches below threshold
- File: `apps/api/src/inventory/dto/adjust-inventory.dto.ts`
  - `quantity: number` (positive=restock, negative=write-off)
  - `reason: string` (mandatory, stored in audit log)

```typescript
// adjust-inventory.dto.ts
export class AdjustInventoryDto {
  @IsInt()
  @IsNotEmpty()
  quantity: number;  // +50 = restock, -10 = write-off

  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  reason: string;  // "Monthly restock from roaster" or "Damaged in shipping"
}
```

**3. Concept Mapping (plan.md Reference):**
- **Audit logging** → "Pattern: AuditLogger" (line ~2374) → all admin mutations logged
- **Guards + RBAC** → "Phase 2.1: Rate Limiting" (line ~3594) + guards concept → admin-only access
- **DTO validation** → "Validation at System Boundaries" (line ~1869) → validate before service call
- **Structured logging** → "Error Handling Strategy #2: Structured Logging" (line ~1686)

**4. Explanation (Why This Is Done This Way):**
Admin inventory adjustments are the highest-risk operations — they directly change sales data. Requiring a `reason` field creates an audit trail that answers "why did stock change?" when discrepancies are found. This is a compliance requirement (FR-Admin-003) and a debugging necessity.

**5. Related Concepts:**
- Separation of concerns — controller validates HTTP, service handles business logic
- NotFoundException pattern — when batchId doesn't exist
- Pagination — inventory list should be paginated for large catalogs

**6. Learning Resource:**
- [NestJS Guards](https://docs.nestjs.com/guards)
- [OWASP: Audit Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

**7. Common Mistakes & Failures:**
- **Mistake:** Allowing adjustment without reason → no audit trail → impossible to investigate discrepancies
- **Mistake:** Not validating that resulting quantity >= 0 → negative inventory breaks checkout logic
- **Mistake:** Missing `@UseGuards(JwtAuthGuard, RolesGuard)` → any user can adjust inventory
- **Why it fails:** Unaudited inventory changes → financial discrepancies → loss of trust

**8. Production Consideration:**
- Logging: Structured audit log with `adminId`, `batchId`, `previousQty`, `newQty`, `reason`, `timestamp`
- Error handling: Reject adjustments that would make inventory negative
- Edge cases: Concurrent adjustments by two admins → transaction isolation prevents conflicts

---

#### Step 2.5: Write Unit Tests for Inventory Logic

**1. Action (What to Build):**
Write comprehensive unit tests for the inventory service and freshness integration. Target: 80%+ coverage on inventory module.

**2. How to Implement:**
```typescript
// apps/api/src/inventory/inventory.service.spec.ts
describe('InventoryService', () => {
  describe('reserveInventory', () => {
    it('should reserve successfully when stock is available', async () => { /* ... */ });
    it('should throw when requesting more than available', async () => { /* ... */ });
    it('should throw when batch does not exist', async () => { /* ... */ });
    it('should handle concurrent reservations correctly', async () => { /* ... */ });
  });

  describe('releaseInventory', () => {
    it('should release reserved quantity', async () => { /* ... */ });
    it('should throw when releasing more than reserved', async () => { /* ... */ });
  });

  describe('adjustInventory', () => {
    it('should increase quantity on positive adjustment', async () => { /* ... */ });
    it('should decrease quantity on negative adjustment', async () => { /* ... */ });
    it('should reject adjustment resulting in negative stock', async () => { /* ... */ });
    it('should require reason field', async () => { /* ... */ });
  });
});
```

**3. Concept Mapping (plan.md Reference):**
- **Unit testing** → "Testing Strategies" (line ~2499) → mock PrismaService, test logic in isolation
- **Test checklist** → "Test Checklist Before Production" (line ~2625) → happy + sad paths + edge cases

**4. Explanation (Why This Is Done This Way):**
Inventory logic is the most critical business logic. A bug here means overselling, underselling, or incorrect financial records. Tests act as executable documentation — they prove the system works and prevent regressions.

**5. Related Concepts:**
- Arrange-Act-Assert pattern (line ~2527) — standard test structure
- Mock dependencies (line ~2530) — test service without real database

**6. Learning Resource:**
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

**7. Common Mistakes & Failures:**
- **Mistake:** Testing only happy path → bugs hide in edge cases (zero quantity, concurrent access)
- **Mistake:** Using real database in unit tests → tests become slow and flaky
- **Mistake:** Not testing error cases → service silently swallows errors in production

**8. Production Consideration:**
- Run tests in CI: `pnpm -C apps/api test --coverage`
- Coverage threshold: 80% minimum for inventory module
- Regression testing: tests prevent future code changes from breaking inventory logic

---

### Phase 2 Failure Handling Integration

**What can fail in this phase:**

| Failure | Impact | Handling Strategy |
|---------|--------|-------------------|
| Database transaction deadlock | Inventory update fails | Retry with exponential backoff (3 attempts) |
| Batch not found | 404 on inventory operations | NotFoundException with clear message |
| Concurrent reservation race | Potential overselling | Prisma transaction + row-level lock |
| Negative inventory after adjustment | Broken business logic | Validate `resultingQty >= 0` before commit |
| Prisma connection lost mid-transaction | Partial state corruption | Transaction auto-rollback (ACID guarantee) |

### Phase 2 Validation Gate (Hard Stop)

**Phase is ONLY complete if ALL pass:**

- [ ] `pnpm -C apps/api test -- batch` — all batch tests pass
- [ ] `pnpm -C apps/api test -- inventory` — all inventory tests pass
- [ ] `pnpm -C apps/api test -- freshness` — all freshness tests pass (regression)
- [ ] `POST /api/admin/batches` creates batch with freshness data in response
- [ ] `GET /api/admin/batches?productId=X` returns batches with `freshness.isPeak` field
- [ ] `POST /api/admin/inventory/:batchId/adjust` requires reason, logs adjustment
- [ ] Concurrent reservation test: two `POST /api/inventory/reserve` on last item → one succeeds, one gets 400
- [ ] `GET /api/admin/inventory/alerts/low-stock` returns batches below threshold
- [ ] No `any` types in batch or inventory modules
- [ ] Test coverage ≥ 80% for inventory service

**If ANY gate fails → fix before proceeding to Phase 3.**

### Phase 2 Review Loop

1. **Code review:** Are all database operations inside transactions where needed?
2. **Architecture validation:** Does batch module only handle batch concerns?
3. **Concept verification:** Can you explain why `isPeakFreshness()` is a pure function and why that matters for testing?
4. **Commit:** `git commit -m "feat(inventory): complete batch tracking and atomic inventory management"`

---

## Phase 3: Storefront — Frontend + Public API (Days 6–8)

**Phase Objective:** Build the customer-facing storefront with Next.js. Deliver product browsing, faceted filtering, product detail pages with sensory profiles, and SSR for performance. This phase treats frontend as a first-class citizen — not an afterthought.

**SRS Mapping:**
- **FR-SF-001** → Browse catalog by categories, view product listings
- **FR-SF-002** → Filter by roast level, grind, weight, acidity, origin, caffeine, process
- **FR-SF-003** → Product detail pages with images, sensory profiles, price, availability
- **NFR-Perf-01** → Storefront API latency < 200ms p95 for cached queries

**Already Built (Do Not Rebuild):**
- ✅ Frontend API client (`lib/http.ts`) — typed `requestJson<T>` with `HttpError`, auth headers, timeout, abort controller
- ✅ Frontend types (`lib/types.ts`) — `Product`, `AuthSession`, `UserRole`, `UserRecord`
- ✅ TanStack Query hooks (`hooks/use-products.ts`) — `useProductsQuery`, `useCreateProductMutation`, etc.
- ✅ Admin product dashboard with edit modal, pagination, skeleton loaders, toast notifications
- ✅ Backend product filtering (admin only, `GET /admin/products/list?name=X&roastLevel=Y`)
- ✅ Backend product CRUD with validation and guards
- ✅ Error boundary component (`error-boundary.tsx`)
- ✅ Skeleton loader component (`skeleton.tsx`)

**What This Phase Actually Adds:**
- Public (unauthenticated) product API endpoints — currently ALL product routes are admin-only
- Customer-facing storefront pages (product grid, detail pages) — currently only admin pages exist
- Sensory profile + freshness visualization components — no storefront UI exists

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| TypeScript interfaces in frontend | "Interfaces vs Types" (line ~693) | Define `Product`, `ProductFilter` types shared between API and frontend |
| Async/await for API calls | "Async/Await (The Modern Standard)" (line ~1151) | Frontend fetch calls to API |
| Error handling in async | "Common Async Mistakes" (line ~1211) | Handle loading states, failed requests |
| Structured error responses | "Phase 1.3: Fix HTTP Exception Contract" (line ~3359) | Frontend reads `{ statusCode, message, error }` |
| Separation of concerns | "Pattern 2: Separation of Concerns" (line ~2288) | Separate API layer, hooks, components |
| Union types | "Union Types" (line ~678) | Filter state types, loading/error/success states |
| Graceful degradation | "Graceful Degradation" (line ~1770) | Show product list even if filter service fails |

### Frontend Architecture (This Phase)

```
apps/web/src/
├── app/                      ← Next.js App Router
│   ├── (storefront)/         ← Customer-facing pages (new)
│   │   ├── products/
│   │   │   ├── page.tsx      ← Product listing with filters
│   │   │   └── [id]/
│   │   │       └── page.tsx  ← Product detail with sensory profile
│   │   └── layout.tsx        ← Storefront layout (nav, footer)
│   ├── (admin)/              ← Admin pages (existing)
│   └── (auth)/               ← Auth pages (existing)
├── components/
│   ├── storefront/           ← Customer components (new)
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductFilters.tsx
│   │   ├── SensoryProfile.tsx
│   │   └── FreshnessBadge.tsx
│   └── ui/                   ← Shared UI components
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── EmptyState.tsx
├── hooks/                    ← Custom React hooks (new)
│   ├── useProducts.ts        ← Fetch + cache product list
│   └── useProduct.ts         ← Fetch single product
├── lib/
│   ├── api.ts                ← HTTP client (existing, enhanced)
│   └── types.ts              ← Shared TypeScript types
└── styles/                   ← Component styles
```

### Implementation Steps

---

#### Step 3.1: Create Public Product API Endpoints

**1. Action (What to Build):**
Create public (unauthenticated) API endpoints for product browsing and filtering. These endpoints serve the customer-facing storefront.

**2. How to Implement:**
- File: `apps/api/src/products/products.controller.ts` — add public routes
- Endpoints:
  - `GET /api/products` — paginated list with optional filters (public, no auth)
  - `GET /api/products/:id` — single product with sensory profile + freshness (public)
  - `GET /api/products/categories` — list available categories
- Query parameters for filtering: `?roastLevel=medium&grind=whole&minPrice=10&maxPrice=50&page=1&limit=20`

```typescript
// Public endpoint — NO guards
@Get()
async findAll(
  @Query() filters: ProductFilterDto,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
): Promise<PaginatedResponse<Product>> {
  return this.productsService.findFiltered(filters, page, limit);
}

// ProductFilterDto
export class ProductFilterDto {
  @IsOptional() @IsString() roastLevel?: string;
  @IsOptional() @IsString() grind?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() process?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsString() search?: string;
}

// Generic paginated response (TypeScript generics applied)
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**3. Concept Mapping (plan.md Reference):**
- **Generics** → "Generics (Reusable Patterns)" (line ~715) → `PaginatedResponse<T>` works for any entity
- **DTO validation** → "Pattern 1: DTO" (line ~803) → filter params validated before query
- **Off-by-one pagination** → "Off-by-One Errors (Pagination)" (line ~2700) → use `(page - 1) * limit`
- **Optional parameters** → `@IsOptional()` allows filters to be omitted (no filter = show all)

**4. Explanation (Why This Is Done This Way):**
Public endpoints have NO authentication guard — customers browse without logging in (FR-SF-001). Filters use query parameters (not POST body) because they're idempotent reads — bookmarkable and cacheable. The generic `PaginatedResponse<T>` avoids repeating pagination structure for every entity.

**Trade-offs:**
- Query params vs POST body for filters → query params are RESTful, cacheable, but limited in URL length
- Server-side filtering vs client-side → server-side scales (don't send 10,000 products to browser)

**5. Related Concepts:**
- REST semantics — GET for reads, query params for filters
- Caching architecture (line ~1516) — filtered product lists are prime cache candidates
- Database indexing — filter columns need indexes for performance

**6. Learning Resource:**
- [Prisma Filtering and Sorting](https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting)
- [REST API Design: Filtering](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/)

**7. Common Mistakes & Failures:**
- **Mistake:** No pagination → returning all 10,000 products → browser crashes, API times out
- **Mistake:** SQL injection via filter params → Prisma prevents this (parameterized queries) but validate anyway
- **Mistake:** Not indexing filter columns → full table scans on every filter request → slow API
- **Why it fails:** Missing `@IsOptional()` on filter fields → validation rejects requests without all filters

**8. Production Consideration:**
- Logging: Log filter combinations for analytics (which filters are popular?)
- Error handling: Invalid filter values → 400 with helpful message ("roastLevel must be one of: light, medium, dark")
- Edge cases: Empty results → return `{ data: [], meta: { total: 0 } }` not 404

---

#### Step 3.2: Build Product Listing Page (Next.js)

**1. Action (What to Build):**
Create the customer-facing product listing page with grid layout, filter sidebar, loading states, and error handling.

**2. How to Implement:**
- File: `apps/web/src/app/(storefront)/products/page.tsx` — SSR product listing
- File: `apps/web/src/components/storefront/ProductCard.tsx` — product card component
- File: `apps/web/src/components/storefront/ProductGrid.tsx` — responsive grid layout
- File: `apps/web/src/components/storefront/ProductFilters.tsx` — filter sidebar
- File: `apps/web/src/hooks/useProducts.ts` — data fetching hook with loading/error states

**Component Architecture:**
```
ProductsPage (page.tsx)
├── ProductFilters        ← Sidebar: roast, grind, origin, price range
│   ├── FilterGroup       ← Reusable filter section
│   └── PriceRangeSlider  ← Min/max price filter
├── ProductGrid           ← Responsive grid of product cards
│   └── ProductCard[]     ← Individual product with image, name, price, freshness
│       └── FreshnessBadge ← "In Peak" / "Stale" indicator
└── Pagination            ← Page navigation
```

**State Management:**
```typescript
// useProducts.ts — Custom hook with typed state
type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: Product[]; meta: PaginationMeta };

function useProducts(filters: ProductFilter) {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });

  useEffect(() => {
    const fetchProducts = async () => {
      setState({ status: 'loading' });
      try {
        const result = await api.getProducts(filters);
        setState({ status: 'success', data: result.data, meta: result.meta });
      } catch (error) {
        setState({ status: 'error', error: error.message });
      }
    };
    fetchProducts();
  }, [filters]);

  return state;
}
```

**3. Concept Mapping (plan.md Reference):**
- **Union types for state** → "Union Types" (line ~678) → `ProductsState` is a discriminated union (loading | error | success)
- **Discriminated unions** → "Discriminated Unions (Type-Safe State)" (line ~820) → `status` field narrows type
- **Async/await** → "Async/Await" (line ~1151) → fetch call in custom hook
- **Error handling in async** → "Common Async Mistakes" (line ~1211) → try/catch around fetch
- **Graceful degradation** → (line ~1770) → show error state, don't crash

**4. Explanation (Why This Is Done This Way):**
Using a discriminated union for state (`loading | error | success`) is safer than separate `isLoading`, `isError`, `data` booleans — it makes impossible states impossible. You can't have `isLoading: true` AND `data: [...]` simultaneously. TypeScript narrows the type: inside `if (state.status === 'success')`, `state.data` is guaranteed to exist.

**Alternatives:**
- React Query / TanStack Query → more features (caching, refetching) but adds dependency
- SWR → lighter alternative by Vercel, designed for Next.js
- For MVP, custom hooks are sufficient. Upgrade to React Query in Phase 5 if needed.

**5. Related Concepts:**
- Component composition — ProductGrid doesn't know about API, receives products as props
- Separation of UI and logic — hooks handle data, components handle rendering
- Server-side rendering (SSR) — initial render on server for SEO and performance

**6. Learning Resource:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react)
- [TypeScript with React](https://react-typescript-cheatsheet.netlify.app/)

**7. Common Mistakes & Failures:**
- **Mistake:** Fetching data in component body (not useEffect) → infinite re-render loop
- **Mistake:** Not handling loading state → blank page while data loads → user thinks app is broken
- **Mistake:** Not handling empty state → no products match filter → blank grid, user is confused
- **Mistake:** Not typing component props → `props.product.nonExistentField` crashes at runtime
- **Why it fails:** Missing error boundary → one component error crashes entire page

**8. Production Consideration:**
- Performance: Use `React.memo()` on ProductCard to prevent unnecessary re-renders when filters change
- UX reliability: Show skeleton loaders during loading, clear error messages on failure
- Maintainability: Keep components under 100 lines — extract sub-components

---

#### Step 3.3: Build Product Detail Page with Sensory Profile

**1. Action (What to Build):**
Create the individual product detail page showing full product information, sensory profile visualization, pricing, availability status, and freshness indicator. This page uses Server-Side Rendering (SSR) for SEO.

**2. How to Implement:**
- File: `apps/web/src/app/(storefront)/products/[id]/page.tsx` — SSR detail page
- File: `apps/web/src/components/storefront/SensoryProfile.tsx` — visual sensory attributes
- File: `apps/web/src/components/storefront/FreshnessBadge.tsx` — peak/stale indicator

```typescript
// apps/web/src/app/(storefront)/products/[id]/page.tsx
// Next.js Server Component with SSR
interface ProductPageProps {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await fetchProduct(params.id);

  if (!product) {
    notFound(); // Next.js built-in 404
  }

  return (
    <div>
      <ProductImages images={product.images} />
      <ProductInfo
        name={product.name}
        price={product.price}
        description={product.description}
      />
      <SensoryProfile profile={product.sensoryProfile} />
      <FreshnessBadge freshness={product.freshness} />
      <AvailabilityStatus inStock={product.available} />
      <AddToCartButton productId={product.id} disabled={!product.available} />
    </div>
  );
}
```

**3. Concept Mapping (plan.md Reference):**
- **TypeScript interfaces for props** → "Interfaces vs Types" (line ~693) → typed component props
- **Null handling** → "Null/Undefined Confusion" (line ~2729) → `notFound()` for missing product
- **Async in frontend** → "Async/Await" (line ~1151) → server component fetches data before render

**4. Explanation (Why This Is Done This Way):**
Using Next.js Server Components for product detail pages provides SSR — the page is rendered on the server and sent as HTML to the browser. This is critical for SEO (search engines index the HTML) and performance (first contentful paint is faster than client-side rendering).

**Trade-offs:**
- SSR → better SEO, faster initial load, but server CPU cost per request
- CSR → lighter server, but blank page until JavaScript loads (bad for SEO)
- Hybrid: Server Component for initial data, Client Components for interactivity (add to cart button)

**5. Related Concepts:**
- CORS and API integration — server component calls API directly (no CORS issues, server-to-server)
- Error boundaries — wrap in `<ErrorBoundary>` to catch rendering failures

**6. Learning Resource:**
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

**7. Common Mistakes & Failures:**
- **Mistake:** Using `useEffect` in Server Component → server components can't use React hooks
- **Mistake:** Not handling 404 → product deleted but page still linked → shows error instead of 404
- **Mistake:** Exposing API_URL in client bundle → security risk. Use server-side env vars
- **Why it fails:** Mixing Server and Client components incorrectly → "useState is not defined" error

**8. Production Consideration:**
- Performance: Cache product detail responses (revalidate every 5 minutes)
- SEO: Add `<title>`, `<meta description>` with product name and sensory attributes
- Edge cases: Product out of stock → show page but disable "Add to Cart" button with clear message

---

#### Step 3.4: Extend Existing API Client for Public Storefront

**1. Action (What to Build):**
The typed API client (`lib/http.ts` + `lib/api.ts`) already exists with `requestJson<T>`, `HttpError`, and auth token management. Extend it with PUBLIC product methods that don't require authentication (for the customer storefront).

**2. How to Implement:**
```typescript
// apps/web/src/lib/api.ts — ADD these public methods to existing file
export function getPublicProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, val] of Object.entries(filters)) {
      if (val) params.set(key, String(val));
    }
  }
  const suffix = params.toString();
  return requestJson<PaginatedResponse<Product>>(
    `/products${suffix ? `?${suffix}` : ''}`,
    { auth: 'none' }  // Public — no auth required
  );
}

export function getPublicProduct(id: string): Promise<Product> {
  return requestJson<Product>(`/products/${id}`, { auth: 'none' });
}
```

**3. Concept Mapping (plan.md Reference):**
- **Generics** → "Generics (Reusable Patterns)" (line ~715) → existing `requestJson<T>` already typed
- **Separation** → public endpoints use `auth: 'none'`, admin use default `auth: 'required'`

**4. Explanation (Why This Is Done This Way):**
We extend the existing client, not replace it. The `requestJson<T>` function already handles all concerns (timeout, error parsing, Content-Type). We simply add new methods that pass `{ auth: 'none' }` for public endpoints.

**5. Related Concepts:**
- Open/Closed Principle — code open for extension, closed for modification
- Existing `HttpError` class handles all error cases already

**6. Learning Resource:**
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

**7. Common Mistakes & Failures:**
- **Mistake:** Building a second HTTP client → duplicates error handling, diverges over time
- **Why it fails:** Not using `auth: 'none'` → public endpoint gets 401 because auth header is empty

**8. Production Consideration:**
- The existing abort controller and timeout logic (`lib/http.ts` line 32-33) covers all new methods automatically

---

### Phase 3 Frontend Production Considerations

| Concern | Implementation | Why |
|---------|---------------|-----|
| **Re-render performance** | `React.memo()` on ProductCard | Prevents re-render when only filters change |
| **Memoization** | `useMemo()` for filtered/sorted lists | Avoid re-computing derived data |
| **Slow requests** | Loading skeleton components | User sees structure immediately |
| **Failed requests** | Error state with retry button | User can recover without page refresh |
| **Empty states** | "No products found" with clear filters link | User isn't confused by blank page |
| **Image loading** | Next.js `<Image>` with lazy loading | Reduces initial page weight |

### Phase 3 Validation Gate (Hard Stop)

**Phase is ONLY complete if ALL pass:**

- [ ] `GET /api/products` returns paginated product list (public, no auth)
- [ ] `GET /api/products?roastLevel=medium` returns filtered results
- [ ] `GET /api/products/:id` returns product with sensory profile and freshness
- [ ] Product listing page renders with products from API
- [ ] Filter sidebar updates product grid on selection
- [ ] Product detail page renders with all SRS-required fields (images, sensory, price, availability)
- [ ] Empty state displays when no products match filter (FR-SF-001 AC)
- [ ] Loading state shows during API fetch
- [ ] Error state shows on API failure with retry option
- [ ] `pnpm -C apps/web build` compiles with zero type errors
- [ ] Page renders under 1.0s on SSR (NFR-Perf staging target)

**If ANY gate fails → fix before proceeding to Phase 4.**

### Phase 3 Review Loop

1. **Code review:** Are components under 100 lines? Is API logic in hooks, not components?
2. **Architecture validation:** Can you add a new filter without modifying ProductGrid?
3. **Concept verification:** Can you explain why discriminated unions are used for `ProductsState`?
4. **Frontend-specific:** Does the page work with JavaScript disabled (SSR)? Are images lazy-loaded?
5. **Commit:** `git commit -m "feat(storefront): product listing and detail pages with filtering"`

---

## Phase 4: Checkout + Subscriptions (Days 9–11)

**Phase Objective:** Implement the complete payment flow using Stripe — one-time purchases and recurring subscriptions. This phase delivers checkout session creation, webhook processing, order management, subscription lifecycle (create, pause, cancel), and the customer-facing checkout UI.

**SRS Mapping:**
- **FR-CO-001** → Checkout session for one-time and subscription purchases
- **FR-CO-002** → Shipping cost calculation by weight tiers
- **FR-CO-003** → Stripe webhook processing for payment confirmation
- **FR-CO-004** → Order record creation on successful payment
- **FR-CO-005** → Apple Pay, Google Pay, credit cards via Stripe
- **FR-CO-006** → Payment failure handling with actionable errors
- **FR-CO-007** → Idempotency keys for duplicate prevention
- **FR-Subs-001** → Purchase mode toggle (one-time vs subscription)
- **FR-Subs-002** → Delivery cadence selection (7/14/30 days)
- **FR-Subs-003** → Subscription management (pause, resume, cancel)
- **FR-Auth-004** → Address book for checkout

**Already Built (Do Not Rebuild):**
- ✅ Prisma schema: `Order` model (id, userId, status, totalCents, currency, paymentProvider, paymentIntentId)
- ✅ Prisma schema: `OrderItem` model (orderId, productVariantId, quantity, unitPriceCents, lineTotalCents)
- ✅ Prisma schema: `Subscription` model (userId, stripeSubscriptionId, status, cadenceDays, nextChargeAt)
- ✅ Prisma schema: `SubscriptionItem` model (subscriptionId, productVariantId, quantity, unitPriceCents)
- ✅ Prisma schema: `WebhookLog` model (provider, eventId @unique, eventType, payload, status, errorMessage)
- ✅ Prisma schema: `ProductVariant` model (productId, weightGrams, priceCents, sku)
- ✅ Prisma enums: `OrderStatus` (pending/paid/failed/refunded), `SubscriptionStatus` (active/paused/canceled), `WebhookStatus` (success/fail)

**What This Phase Actually Adds:**
- Stripe SDK integration and Checkout Session creation (no code exists)
- Order/Checkout NestJS modules, services, and controllers (only schemas exist)
- Webhook controller with signature validation (only schema exists)
- Subscription service with Stripe Billing API (only schema exists)
- Frontend checkout flow (no pages exist)

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| Callbacks in event handling | "Callbacks in Modern Context" (line ~1313) | Stripe webhook event listeners |
| Async/await for external APIs | "Pattern 2: Service with multiple async" (line ~1276) | Stripe API calls (sequential operations) |
| Idempotency | "FR-CO-007" in SRS | Idempotency key per checkout session |
| Retry mechanisms | "Error Handling Strategy #3: Retry" (line ~1731) | Retry Stripe calls on timeout |
| Graceful degradation | "Error Handling Strategy #4" (line ~1770) | Payment fails → clear error, not crash |
| Circuit breaker | "Error Handling Strategy #5" (line ~1808) | Protect against Stripe outages |
| Transactions | "Phase 3.3: Atomic Transactions" (line ~4409) | Order creation + inventory confirmation |
| Webhook validation | SRS NFR-Sec → "webhook events are signature-validated" | Stripe signature verification |

### Implementation Steps

---

#### Step 4.1: Create Order & Checkout Modules

**1. Action (What to Build):**
Create Order and Checkout NestJS modules with Stripe integration. The Prisma schema for `Order`, `OrderItem`, `ProductVariant`, and `WebhookLog` already exists — build the service layer.

**2. How to Implement:**
- Prisma schema: ✅ Already exists (`Order`, `OrderItem`, `ProductVariant`, `WebhookLog` models defined)
- Generate: `pnpm -C apps/api exec nest g module order && nest g module checkout`
- Implement `CheckoutService.createSession()` — creates Stripe Checkout Session
- Implement `OrderService.createFromWebhook()` — creates order on payment success
- Implement `WebhookController` — handles Stripe webhook events

**3. Concept Mapping (plan.md Reference):**
- **Callbacks** → "Callbacks in Modern Context" (line ~1313) → Stripe webhook is a callback pattern (Stripe calls YOUR endpoint)
- **Async/await** → "Pattern 2: Service with async" (line ~1276) → sequential operations: validate → reserve → create session
- **Idempotency** → SRS FR-CO-007 → generate unique key per checkout, store in order record
- **Retry** → "Retry Mechanisms" (line ~1731) → retry Stripe API on 5xx errors

**4. Explanation (Why This Is Done This Way):**
Stripe Checkout Sessions offload PCI compliance to Stripe — we never handle raw credit card numbers. The webhook pattern means Stripe notifies us when payment succeeds/fails, rather than polling. This is the callback pattern applied at the infrastructure level.

**5. Related Concepts:**
- Webhook = callback at HTTP level — Stripe POSTs to our endpoint when event occurs
- Idempotency prevents duplicate charges — if webhook fires twice, order is created only once
- Signature validation (HMAC) — proves the webhook came from Stripe, not an attacker

**6. Learning Resource:**
- [Stripe Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)

**7. Common Mistakes & Failures:**
- **Mistake:** Processing raw body as JSON before Stripe verification → signature check fails
- **Mistake:** Not validating webhook signature → anyone can POST fake payment events
- **Mistake:** Creating order before payment confirmation → orders exist for failed payments
- **Why it fails:** Missing idempotency → network retry delivers webhook twice → duplicate order

**8. Production Consideration:**
- Logging: Log every webhook event with `eventId`, `type`, `timestamp` for audit
- Error handling: Return 200 to Stripe even if processing fails (acknowledge receipt, retry internally)
- Edge cases: User closes browser during payment → webhook still fires → order created correctly

---

#### Step 4.2: Implement Subscription Lifecycle

**1. Action (What to Build):**
Add subscription support — toggle between one-time and subscription purchase, cadence selection, and subscription management (pause, resume, cancel) via Stripe Billing.

**2. How to Implement:**
- Prisma schema: ✅ Already exists (`Subscription` model with `status`, `cadenceDays`, `stripeSubscriptionId`, `SubscriptionItem` model)
- Generate: `pnpm -C apps/api exec nest g module subscription`
- Implement `SubscriptionService`: `create()`, `pause()`, `resume()`, `cancel()`, `handleWebhook()`
- Implement `SubscriptionController`: authenticated endpoints for My Account portal
- Frontend: subscription toggle on product page, My Account subscription listing

**3. Concept Mapping (plan.md Reference):**
- **Async patterns** → "Async Patterns in NestJS" (line ~1259) → Stripe API calls
- **Error handling** → "Error Handling in async" (line ~1297) → Stripe failures → user-friendly messages
- **Guards** → "NestJS Request Pipeline Guards" (line ~1356) → authenticated access to subscription management

**4. Explanation (Why This Is Done This Way):**
Subscription management is delegated to Stripe Billing — we store the `stripeSubscriptionId` and call Stripe's API to pause/resume/cancel. This avoids building our own billing engine (massive complexity) while maintaining control over the user experience.

**5. Related Concepts:**
- Webhook event types: `customer.subscription.updated`, `invoice.payment_succeeded`
- Idempotent webhook processing — same event delivered multiple times must produce same result
- State machine: subscription has defined states (active → paused → active, active → canceled)

**6. Learning Resource:**
- [Stripe Billing/Subscriptions](https://stripe.com/docs/billing/subscriptions)
- [Stripe Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)

**7. Common Mistakes & Failures:**
- **Mistake:** Allowing billing while paused → Stripe handles this, but verify in webhook handler
- **Mistake:** Not storing `stripeSubscriptionId` → can't manage subscription later
- **Mistake:** Canceling subscription in DB but not in Stripe → user still charged
- **Why it fails:** Out-of-sync state between Stripe and our DB → user sees "canceled" but gets charged

**8. Production Consideration:**
- Logging: Log every subscription state change with `userId`, `subscriptionId`, `previousStatus`, `newStatus`
- Error handling: Stripe API timeout → return "Please try again" not 500
- Edge cases: User cancels subscription 1 minute before charge → webhook for charge may still arrive

---

#### Step 4.3: Build Checkout Frontend Flow

**1. Action (What to Build):**
Create the customer checkout experience — cart review, address selection, purchase mode toggle (one-time vs subscription), and Stripe payment integration.

**2. How to Implement:**
- File: `apps/web/src/app/(storefront)/checkout/page.tsx`
- File: `apps/web/src/components/storefront/CartSummary.tsx`
- File: `apps/web/src/components/storefront/AddressForm.tsx`
- File: `apps/web/src/components/storefront/PurchaseModeToggle.tsx`
- Stripe redirect: create session on backend → redirect to Stripe Checkout → return to success/cancel page

**3. Concept Mapping (plan.md Reference):**
- **TypeScript in frontend** → typed props for checkout components
- **Async API calls** → checkout session creation as async operation
- **Error handling** → payment failures displayed with actionable guidance (FR-CO-006)
- **Separation of concerns** → API logic in service, UI in components

**4. Explanation (Why This Is Done This Way):**
Using Stripe Checkout (hosted page) instead of Stripe Elements (embedded form) minimizes PCI compliance scope. Stripe handles all payment UI, validation, and card storage. We only create a "session" and redirect the user. After payment, Stripe redirects back to our success/cancel page and fires a webhook.

**5. Related Concepts:**
- Redirect-based payment flow — user leaves our site, returns after payment
- CSRF protection — checkout creation requires authenticated session
- Loading states — show spinner between "Place Order" click and Stripe redirect

**6. Learning Resource:**
- [Stripe Checkout: Client and Server](https://stripe.com/docs/payments/checkout)
- [Next.js Redirects](https://nextjs.org/docs/app/api-reference/functions/redirect)

**7. Common Mistakes & Failures:**
- **Mistake:** Showing "Order Confirmed" before webhook confirms payment → payment may still fail
- **Mistake:** Not handling "cancel" URL → user clicks back on Stripe page → stuck
- **Mistake:** Cart total calculated on frontend only → user modifies DOM → server must re-validate
- **Why it fails:** Trusting client-side price calculation → attacker modifies total → charges $0.01

**8. Production Consideration:**
- Logging: Log checkout initiation with `userId`, `cartTotal`, `itemCount`
- Error handling: Stripe redirect failure → show "Payment could not be completed" with retry
- Edge cases: Session expires → create new session, don't reuse stale one

---

### Phase 4 Validation Gate (Hard Stop)

- [ ] `POST /api/checkout/session` creates Stripe Checkout Session
- [ ] Stripe webhook updates order status within 1 minute (FR-CO-003 AC)
- [ ] Duplicate webhook events don't create duplicate orders (idempotency)
- [ ] Subscription creation with cadence selection works (FR-Subs-001, FR-Subs-002)
- [ ] Pause/resume/cancel subscription from My Account (FR-Subs-003)
- [ ] Payment failure shows clear error with retry guidance (FR-CO-006)
- [ ] Shipping cost calculated from weight tiers (FR-CO-002)
- [ ] Frontend checkout flow: product → cart → checkout → Stripe → success page
- [ ] Address CRUD works (FR-Auth-004)

### Phase 4 Review Loop

1. **Code review:** Are all Stripe API calls wrapped in try/catch with timeout?
2. **Architecture validation:** Is payment logic isolated in checkout module (not leaking into product module)?
3. **Concept verification:** Can you explain why webhooks use the callback pattern and why idempotency matters?
4. **Commit:** `git commit -m "feat(checkout): Stripe payment flow with subscriptions and webhooks"`

---

## Phase 5: Robustness + Auth Hardening (Days 12–13)

**Phase Objective:** Add audit logging, role-based access control, password reset flow, and strengthen error handling across the application. This phase makes the system production-trustworthy.

**SRS Mapping:**
- **FR-Admin-006** → Audit log view with date/actor filters
- **FR-Admin-007** → RBAC (viewer, operator, manager roles)
- **FR-Auth-003** → Password reset via email token
- **FR-Auth-005** → CSRF protection for state-changing actions
- **FR-Auth-006** → Sign-out and session invalidation

**Already Built (Do Not Rebuild):**
- ✅ `RolesGuard` — fully working guard with `Reflector`, checks `user.role` against `@Roles()` metadata
- ✅ `@Roles` decorator — `SetMetadata(ROLES_KEY, roles)` pattern
- ✅ `UserRole` enum in Prisma — `viewer`, `operator`, `manager`, `admin` already defined
- ✅ Prisma schema: `AuditEvent` model (actorUserId, action, targetType, targetId, metadata, createdAt)

**What This Phase Actually Adds:**
- AuditLog service + interceptor (schema exists, no service code)
- Per-route permission matrix (guard exists, but all routes just use `@Roles('admin')`)
- Password reset flow (completely new)
- Session invalidation with Redis token blacklist (completely new)

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| Structured logging | "Strategy #2: Structured Logging" (line ~1686) | Audit log entity with structured fields |
| Validation at boundaries | "Strategy #6: Validation at Boundaries" (line ~1869) | CSRF protection, input sanitization |
| Guards | "NestJS Request Pipeline → Guards" (line ~1356) | Add permission matrix to EXISTING RolesGuard |
| JWT security | "Decision 4: JWT vs Sessions" (line ~2049) | Token blacklist for sign-out |
| Retry mechanisms | "Strategy #3: Retry" (line ~1731) | Email sending retry for password reset |

### Implementation Steps (Condensed — Same 8-Element Format)

#### Step 5.1: Audit Log System
- **Action:** Create AuditLog service + interceptor that uses the EXISTING `AuditEvent` schema to log all admin mutations
- **Concept:** Structured logging (line ~1686), Interceptors (line ~1363)
- **Production:** Every admin action traceable by user, timestamp, and target entity

#### Step 5.2: Fine-Grained Permission Matrix
- **Action:** The RolesGuard already works — define which roles can access which endpoints: `viewer` (read-only admin views), `operator` (CRUD products/inventory), `manager` (all + user management), `admin` (everything)
- **Concept:** Guards (line ~1356), existing `@Roles` decorator
- **Production:** Viewer can view orders but not modify inventory — enforcement via `@Roles('operator', 'manager', 'admin')` per route

#### Step 5.3: Password Reset Flow
- **Action:** Token generation → email sending → token validation → password update
- **Concept:** Async/await for email (line ~1151), Retry for transient email failures (line ~1731)
- **Production:** Single-use tokens with 1-hour expiry, rate-limited to 3 per hour

#### Step 5.4: Session Management
- **Action:** Sign-out invalidates JWT via token blacklist (Redis), CSRF token for state-changing requests
- **Concept:** JWT vs Sessions (line ~2049), Redis usage (line ~112)
- **Production:** Blacklisted tokens checked on every authenticated request

### Phase 5 Validation Gate

- [ ] Admin actions produce audit log entries
- [ ] Viewer role can read data but cannot modify
- [ ] Password reset email sent with single-use token
- [ ] Sign-out invalidates session token
- [ ] CSRF protection on state-changing endpoints

---

## Phase 6: Production Hardening (Day 14)

**Phase Objective:** Prepare the application for production deployment. Docker containerization, CI/CD pipeline, monitoring setup, and final security hardening.

**SRS Mapping:**
- **NFR-Perf-01** → API latency < 200ms p95
- **NFR-Avail-01** → 99.9% availability for checkout
- **NFR-Sec-01** → TLS enforcement, webhook validation, PCI scope minimized

### plan.md Concept Mapping (MANDATORY)

| Concept from plan.md | Section Reference | Application in This Phase |
|----------------------|-------------------|--------------------------|
| Docker multi-stage builds | "Docker: Layered Images" (line ~56) | Production Dockerfile with optimized image |
| GitHub Actions CI/CD | "GitHub Actions" (line ~247) | Automated test + build + deploy pipeline |
| Nginx reverse proxy | "Nginx: Reverse Proxy" (line ~193) | Load balancing configuration |
| Monitoring | "Monitoring & Observability" (line ~402) | Sentry error tracking, basic metrics |
| Health checks | "Production Deployment Architecture" (line ~1942) | `/health` endpoint for Docker + load balancer |
| Secrets management | "Secrets Management" (line ~5670) | GitHub Secrets for CI/CD variables |
| Logging strategy | "Logging Strategy (Production)" (line ~5690) | Winston structured logging |

### Implementation Steps (Condensed)

#### Step 6.1: Production Dockerfiles
- **Action:** Multi-stage Dockerfile for API + web, docker-compose.prod.yml
- **Concept:** Docker layers (line ~56) → cache npm install layer, minimize final image
- **Production:** Final image < 200MB, non-root user, health check

#### Step 6.2: GitHub Actions Pipeline
- **Action:** `.github/workflows/test.yml` + `deploy.yml` → test on PR, deploy on merge to main
- **Concept:** CI/CD (line ~247) → lint → test → build → deploy
- **Production:** Broken tests block deployment

#### Step 6.3: Health Check & Monitoring
- **Action:** `/health` endpoint checking DB + Redis connectivity, Sentry integration
- **Concept:** Production readiness checklist (line ~2882), Monitoring tools (line ~402)
- **Production:** Health check responds in < 100ms, Sentry captures unhandled errors

#### Step 6.4: Security Hardening
- **Action:** Helmet.js headers, rate limiting with Redis, input sanitization, dependency audit
- **Concept:** Security considerations throughout plan.md
- **Production:** `npm audit` shows zero critical vulnerabilities, TLS enforced

### Phase 6 Validation Gate

- [ ] `docker build` produces working image < 200MB
- [ ] GitHub Actions pipeline: lint → test → build passes
- [ ] `/health` endpoint returns 200 with DB + Redis status
- [ ] Sentry captures test error correctly
- [ ] `npm audit` reports zero critical vulnerabilities
- [ ] Application runs in Docker with `docker-compose -f docker-compose.prod.yml up`
- [ ] API responds within NFR latency budgets under basic load

---

## Post-Execution: Final Verification

### Full SRS Traceability Check

| SRS Requirement | Phase Delivered | Test ID | Status |
|----------------|----------------|---------|--------|
| FR-SF-001 | Phase 3 | AT-SF-001 | ☐ |
| FR-SF-002 | Phase 3 | AT-SF-002 | ☐ |
| FR-SF-003 | Phase 3 | AT-SF-003 | ☐ |
| FR-Subs-001 | Phase 4 | AT-Subs-001 | ☐ |
| FR-Subs-002 | Phase 4 | AT-Subs-001 | ☐ |
| FR-Subs-003 | Phase 4 | AT-Subs-002 | ☐ |
| FR-CO-001 | Phase 4 | AT-CO-001 | ☐ |
| FR-CO-003 | Phase 4 | AT-CO-002 | ☐ |
| FR-CO-007 | Phase 4 | AT-CO-002 | ☐ |
| FR-Inv-001 | Phase 2 | AT-Inv-001 | ☐ |
| FR-Inv-002 | Phase 2 | AT-Inv-002 | ☐ |
| FR-Inv-003 | Phase 2 | AT-Inv-003 | ☐ |
| FR-Admin-001 | ✅ Pre-built | — | ✅ |
| FR-Admin-006 | Phase 5 | AT-Admin-001 | ☐ |
| FR-Admin-007 | ✅ Pre-built (guard) / Phase 5 (matrix) | AT-Admin-002 | 🟡 |
| FR-Auth-001 | ✅ Pre-built | — | ✅ |
| FR-Auth-003 | Phase 5 | AT-Auth-002 | ☐ |
| FR-Auth-004 | Phase 4 | AT-Auth-003 | ☐ |

### Production-Grade Enforcement Summary

Each phase progressively enforced:

| Concern | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|---------|---------|---------|---------|---------|---------|---------|
| **Error handling** | Exception filter (CREATE) | Transaction errors | API fetch errors | Payment failures | Audit + logging | Sentry monitoring |
| **Separation of concerns** | ✅ Pre-built modules | Service isolation | Component architecture | Checkout isolation | Permission matrix | Docker separation |
| **TypeScript strictness** | `strict: true` (FIX) | Typed inventory | Typed frontend | Typed Stripe SDK | Typed guards | Build verification |
| **Async discipline** | ✅ Pipeline exists | Transactions | Fetch hooks | Stripe API + webhooks | Email sending | Health checks |
| **Observability** | ✅ Console logging | Audit logs | Error states | Payment logs | Structured logging | Sentry + metrics |

---

**You are now at Phase 1 (Days 1–2). Your next action:**

1. Fix TypeScript strict mode — `tsconfig.json` has `noImplicitAny: false` (Step 1.1)
2. Create global exception filter — currently missing (Step 1.2)
3. Create UpdateProductDto — PATCH uses CreateProductDto (Step 1.3)
4. Harden main.ts — add `setGlobalPrefix`, `forbidNonWhitelisted`, remove manual rate limiting (Step 1.4)
5. Pass Phase 1 Validation Gate before proceeding to Phase 2

**Every phase has an "Already Built" section — DO NOT rebuild existing features. Every gate is a hard stop. Build what's missing. Test it. Ship it. 🚀**


