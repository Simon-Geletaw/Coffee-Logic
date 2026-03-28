# The Coffee Logic Masterclass: The Senior Backend Engineer Curriculum

This document is your definitive blueprint. We are upgrading your knowledge from **Java/Django** to **TypeScript/NestJS**, while rigorously training you in **Production Architecture, Networking, API Contracts, and Incident Response**. 

This is what separates a Junior (who just writes code) from a Senior (who designs systems that survive reality).

---

## 🏗️ Part 1: Networking Architecture & Traffic Flow

How does a request actually reach your code in production? A Senior Developer knows the entire path.

1. **DNS Resolution & CDN:** The user visits `admin.coffeelogic.com`. Cloudflare or Vercel acts as a CDN (Content Delivery Network), caching static frontend assets.
2. **Reverse Proxy / Load Balancer:** Traffic hits a reverse proxy (like Nginx, AWS ALB, or Railway's ingress). Its job is **SSL Termination** (decrypting HTTPS into HTTP) and routing traffic to the healthy Node.js processes.
3. **The Node.js Process (Your App):** The unencrypted HTTP request hits your NestJS app on port `3001`.
4. **The VPC (Virtual Private Cloud):** Your NestJS app lives in a private subnet. Your PostgreSQL database lives in an even deeper private subnet. 
   - ⚠️ **Senior Rule:** Your database must *never* have a public IP address. It only allows connections from the IP range of your Node.js application cluster.
5. **Connection Pooling:** Your app uses Prisma to talk to Postgres. We will use `@Global()` to ensure your app only opens exactly 10 connections to the database, preventing connection exhaustion attacks.

---

## 📜 Part 2: Commit Flows & API Contracts

Seniors do not write code in isolation. They treat their commits and APIs as **Contracts** with the rest of the team.

### 2.1 The Commit Pipeline (Trunk-Based Development)
We will use **Trunk-Based Development** rather than GitFlow. 
- You create short-lived branches (`feat/auth-rate-limit`).
- You commit using **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`. This is a *contract* allowing CI/CD to auto-generate release notes.
- You open a Pull Request. CI runs `tsc --noEmit` (Type Checking), `eslint` (Linting), and `jest` (Unit Tests). If CI fails, the PR cannot be merged.

### 2.2 The API Contract (OpenAPI / Swagger)
Your Rest API is a contract between the Backend Team and the Frontend Team. 
- If you change a DTO from `passwordHash: string` to `password: string` without telling the frontend, you broke the contract and caused a production outage.
- **The Solution:** We implement `@nestjs/swagger`. Our code *is* the documentation. The frontend team can automatically generate their React Query hooks directly from our Swagger JSON file.

---

## 📘 Part 3: Language Fundamentals (Node.js vs. Java/Python)

### 3.1 The Execution Model: Event Loop vs. Threads
- **In Java/Spring:** Every HTTP request spawns a new thread from the Tomcat thread pool. If the DB is slow, the thread sleeps.
- **In Node.js:** There is **ONE main thread** running the Event Loop. 
  - **The Golden Rule:** Never run heavy CPU calculations (nested `for` loops, image processing) directly in a controller, or *every other user's request will hang*. Node is meant for I/O (waiting for databases or APIs), handled gracefully by `async/await`.

### 3.2 The Type System: Structural vs. Nominal
- **In Java (Nominal):** Classes match by *name*.
- **In TypeScript (Structural):** If an object has the required properties (duck typing), it passes. 
- **The Senior Trap:** TypeScript types *vanish* at runtime. If an API user sends `{"email": 123}`, Node sees a number. This is why we absolutely must use **Zod** or **class-validator** for **Runtime Validation**.

---

## 🏛️ Part 4: Framework Internals (The NestJS Request Pipeline)

When a request enters NestJS, it passes through strict, predictable layers:
1. **Middleware:** Standard HTTP modifications (Helmet for security).
2. **Guards:** Authorization. Does this user have a valid JWT? (Returns 401/403).
3. **Interceptors (Before):** Start a metrics timer.
4. **Pipes:** Validation (`class-validator`). Rejects bad JSON payloads with 400 Bad Request.
5. **Controller:** Routes the request.
6. **Service / Provider:** The Business Logic & Prisma DB calls. Injected via Nest's deeply integrated Dependency Injection (DI) IoC Container.
7. **Interceptors (After):** Serialize the response.
8. **Exception Filters:** The final safety net catching any thrown exceptions and formatting them.

---

## 🚨 Part 5: Observability & Production Incident Response

When the pager goes off, how do you fix it? A Senior relies on the **Three Pillars of Observability**: Logs, Metrics, and Traces.

1. **Incident: The API is returning HTTP 500s.**
   - *Investigation:* Look at structured JSON Logs (Pino/Winston). If you see a `PrismaClientKnownRequestError`, the DB might be unreachable or returning foreign-key violations.
   - *Resolution:* Your Global Exception Filter should catch this, log the stack trace to Sentry, and return a safe generic message to the user.
2. **Incident: App is extremely slow (CPU 100%).**
   - *Investigation:* The Node.js Event Loop is blocked. Look at Traces (Datadog/NewRelic). 
   - *Resolution:* Revert the offending commit. Move the heavy math calculation to a background worker queue (like Redis BullMQ).
3. **Incident: "Too Many Connections" Database Error.**
   - *Cause:* NestJS spawned too many `PrismaClient` instances.
   - *Resolution:* Configured via `@Global()` Prisma singleton to cap pool sizes.

---

## 🗓️ Part 6: The 7-Day Curriculum & Implementation Plan

We will now apply all these theories directly to fixing Coffee Logic's Technical Debt.

### Day 1: Configuration & API Contracts
- **Task:** Create a `@nestjs/config` module. Validate `JWT_SECRET` with **Zod** to guarantee the app crashes on bad environments (preventing silent prod failures). Fix `AuthService` to cleanly `throw new UnauthorizedException()`, honoring strict HTTP Rest Contracts instead of returning false HTTP 200s.

### Day 2: Resiliency & The Pipeline
- **Task:** Build a Global **Exception Filter** to catch raw Prisma errors and format them safely for Log aggregation. Add `@nestjs/throttler` (Rate Limiting **Guard**) to protect against botnet brute-force attacks at the networking edge.

### Day 3: Domain Logic & Pure Functions
- **Task:** Build the `InventoryService`. Write a pure TypeScript function to calculate peak freshness (zero framework dependencies). Use Prisma's `$transaction` to atomically reserve inventory—preventing critical race conditions when two users click "buy" simultaneously.

### Day 4: Separation of Concerns & Observability
- **Task:** Build a public `StorefrontController` that heavily utilizes DTOs to strip hidden database fields from public view. Implement an `AuditService` (via **Interceptors**) to log every mutative action an Admin takes for compliance tracking.

### Day 5: External Boundaries & Async Webhooks
- **Task:** Integrate Stripe Checkout. Node.js processes the raw byte buffer heavily relying on **Event Loop** streams to cryptographically verify incoming payments. Enforce database idempotency constraints (so no order is billed twice if the network drops).

### Day 6: Automated Confidence (CI & Testing)
- **Task:** Emulate the Commit Pipeline. Write E2E Tests using `supertest` to guarantee our Auth Guards actually block hackers. Apply `helmet()` middleware to plug networking vulnerabilities (XSS, Sniffing).

### Day 7: Safe Operations (Shipping)
- **Task:** Replicate Production Architecture. Read architecture decision records (ADRs). Safely deploy Prisma migrations using `migrate deploy` and execute Smoke Tests.

---

## 🛑 Ready to Execute?

You now have the exact mental models of a Senior Node.js Developer: from VPC networking, to Git commit contracts, to event-loop mechanics, to exception-based error handling.

**Our first task is Day 1: Configuration & API Contracts.** We will fix your silent JWT configuration bug using Zod, and establish proper Exception Filters instead of false HTTP 200 codes.

If you are ready for me to guide you through writing your first Zod schema, drop a **"Go"** and we shall begin coding.
