# Coffee Logic: Production Build and Learning Guide

This README is your primary reference to build Coffee Logic as a production-ready platform while learning TypeScript, NestJS, and real-world backend/frontend workflows.

It is written as a teacher + supervisor guide so you can implement section by section and request review after each section.

## 1. How To Use This Guide

Use this workflow:

1. Read one section only.
2. Implement exactly what that section asks.
3. Run the required checks/tests.
4. Send a review message in this format:
   - `Section X done`
   - What you changed
   - Evidence (build/test output, endpoint checks)
5. Wait for review before moving to the next section.

This prevents broken architecture and saves rework.

## 2. Source Requirements (SRS)

This guide is based on:

- `SRS.md`
- `SRS-Admin.md`
- `SRS-User-Auth.md`
- `SRS-Storefront.md`
- `SRS-Checkout.md`
- `SRS-Inventory.md`
- `docs/admin-ui/README.md`

Core requirement groups:

- Storefront: `FR-SF-*`
- Subscriptions: `FR-Subs-*`
- Checkout: `FR-CO-*`
- Inventory: `FR-Inv-*`
- Admin: `FR-Admin-*`
- Auth: `FR-Auth-*`

## 3. Current Baseline (Where You Are Now)

What is already in place:

- API app in NestJS (`apps/api`)
- Web app in Next.js (`apps/web`)
- Prisma schema and migrations
- JWT auth strategy and guards (auth + roles)
- Admin product routes protected by JWT + role checks
- Frontend login page and local session storage
- Frontend admin session gating and token forwarding

What still needs hardening for production:

- Centralized config validation (`JWT_SECRET` required, not optional fallback)
- Rate limiting on auth endpoints
- CSRF strategy for cookie-based flows (if you move from localStorage)
- Full e2e auth matrix automation
- Audit logs and security event tracking

## 4. Architecture Overview

### 4.1 High-level stack

- Frontend: Next.js App Router + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL via Prisma
- Auth: JWT (access token)
- Payments: Stripe (planned by SRS)

### 4.2 Responsibility boundaries

- Controller: transport layer (request/response, decorators)
- Service: business logic
- Guard: access control
- DTO: request/response contract validation
- Prisma: data access

### 4.3 Request pipeline in NestJS

Inbound request flow:

1. Middleware
2. Guards
3. Interceptors (before)
4. Pipes / DTO validation
5. Controller
6. Service
7. Interceptors (after)
8. Exception filters

If you understand this pipeline, you can debug almost any issue.

## 5. NestJS Concepts You Must Master

### 5.1 Middleware

Use for cross-cutting request processing before guards/controllers.

Examples:

- Request ID attachment
- Basic request logging
- Correlation IDs

Benefit:

- Consistent behavior across all routes without copy-pasting.

Do not use middleware for authorization logic. Use guards for that.

### 5.2 Guards

Guards decide if a request is allowed.

Current pattern used:

- `JwtAuthGuard`: verifies identity (`401` if invalid/missing token)
- `RolesGuard`: verifies permission (`403` if role mismatch)

Benefit:

- Clean and testable security boundaries.

### 5.3 Pipes and DTO Validation

Use class-validator decorators in DTOs.

Benefit:

- Reject bad input before business logic runs.
- Stronger API contracts and safer refactoring.

### 5.4 Interceptors

Use for:

- Response shaping
- Performance timing
- Caching and serialization hooks

Benefit:

- Cross-cutting behavior without polluting services/controllers.

### 5.5 Exception Filters

Use global exception filter to normalize API error shape.

Benefit:

- Predictable errors for frontend and logs.

### 5.6 Config Module and validation

Use `@nestjs/config` and runtime schema validation (e.g., zod/joi).

Benefit:

- Fail fast on missing env vars (`JWT_SECRET`, DB URL, Stripe keys).

## 6. TypeScript Concepts You Must Master

### 6.1 Type vs Runtime

- TypeScript types are compile-time only.
- Validation decorators are runtime enforcement.

You need both.

### 6.2 DTO classes vs interfaces

- Use classes for DTOs (decorators require runtime metadata).
- Use interfaces/types for internal shapes.

### 6.3 Narrowing and unknown

Never trust untyped external data.

- Parse
- validate
- narrow
- then use

### 6.4 Avoid `any` in security-sensitive code

Especially in auth payloads and request.user.

## 7. Build Strategy: Start From The End (Reverse Planning)

Work backward from acceptance and production outcomes.

### 7.1 End-state outcomes

- Secure admin and user auth
- Stable product/admin operations
- Measurable SLAs (latency, reliability)
- Test coverage on critical flows

### 7.2 Reverse sequence

1. Define acceptance tests first.
2. Define API contracts and DTOs.
3. Implement guards/security boundaries.
4. Implement service logic.
5. Implement persistence and migrations.
6. Implement UI and API integration.
7. Add observability + hardening.

This reduces rework and surprises.

## 8. Section-by-Section Implementation Plan (Review After Each)

Each section includes:

- What to build
- Why it matters
- What to verify
- What to send for review

### Section 1: Configuration and environment hardening

Build:

- Central config service and env validation
- Mandatory `JWT_SECRET`
- Environment split (`development`, `staging`, `production`)

Why:

- Prevent runtime misconfiguration incidents.

Verify:

- App fails to start when `JWT_SECRET` missing.

Send for review:

- Config module file(s)
- Startup behavior evidence

### Section 2: Authentication foundation

Build:

- Login DTO, auth service validation
- JWT signing with role claim
- Password hashing consistency on user create

Why:

- Identity correctness is the root of all access control.

Verify:

- Invalid credentials always return same safe error message
- Successful login returns token with expected claims

Send:

- Auth service and DTO changes
- Manual login test results

### Section 3: Authorization boundaries

Build:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles` metadata usage

Why:

- Separate authentication from authorization.

Verify matrix:

- No token -> 401
- Bad token -> 401
- Valid non-admin on admin route -> 403
- Valid admin on admin route -> 200

Send:

- Guard files + protected route usage
- Matrix evidence

### Section 4: User management and onboarding

Build:

- Create-user flow with password hashing
- Role assignment policy
- Basic account status controls (`isActive`)

Why:

- Onboarding must be secure and operationally manageable.

Verify:

- New account can log in
- Inactive account cannot access protected routes

Send:

- User service and controller behavior summary

### Section 5: Admin product workflows

Build:

- Create/update/archive product flows
- Role-protected product admin endpoints
- Clear frontend error handling for 401/403

Why:

- Core admin operations map to `FR-Admin-001`.

Verify:

- Admin actions work with admin token only

Send:

- API and UI integration test notes

### Section 6: Inventory foundation

Build:

- Batch model usage
- Peak-window computation service
- Inventory state transitions

Why:

- Inventory correctness impacts storefront trust and fulfillment.

Verify:

- In-peak/out-of-peak calculation correctness

Send:

- Service logic + sample test cases

### Section 7: Checkout reliability patterns

Build:

- Idempotency key handling
- Stripe webhook verification and idempotent processing
- Order creation only after payment confirmation

Why:

- Prevent duplicate charges and order corruption.

Verify:

- Replayed webhook does not duplicate order

Send:

- Webhook handling flow and test evidence

### Section 8: Subscription lifecycle

Build:

- Create/pause/resume/cancel lifecycle
- Reminder scheduling and retries

Why:

- Recurring billing needs strict state consistency.

Verify:

- State transitions within SLA window

Send:

- Transition matrix + tests

### Section 9: Observability and audit

Build:

- Structured logs
- Request ID propagation
- Audit events for admin mutations

Why:

- Compliance and incident response.

Verify:

- Every admin mutation logs actor + action + timestamp

Send:

- Sample logs and audit records

### Section 10: Test automation and quality gates

Build:

- Unit tests for services/guards
- Integration tests for DB flows
- E2E tests for critical auth and admin workflows
- CI gate: lint + test + build

Why:

- Regression protection for production changes.

Verify:

- CI fails on broken auth contract or RBAC

Send:

- Test report summary and CI output

### Section 11: Security hardening

Build:

- Auth rate limiting and lockout policy
- Secure headers
- Input sanitization strategy
- Session policy decision (JWT storage strategy)

Why:

- Reduce brute-force and abuse risk.

Verify:

- Rate-limit behavior under repeated failed logins

Send:

- Security checklist with evidence

### Section 12: Release readiness

Build:

- Runbook, rollback, migrations checklist
- Performance smoke tests
- Backup/restore validation

Why:

- Delivery confidence for client environments.

Verify:

- Dry-run release in staging

Send:

- Release checklist completion

## 9. Testing Strategy (How To Write Tests)

### 9.1 Test pyramid

- Unit tests: fast, focused, business logic
- Integration tests: service + DB behavior
- E2E tests: API contracts and full flows

### 9.2 Auth tests you must always have

- Login success and failure
- JWT-protected route without token -> 401
- Invalid token -> 401
- Non-admin on admin route -> 403
- Admin on admin route -> 200

### 9.3 Product admin tests

- Create product success
- Validation failure on bad payload
- Update product partial fields
- Archive product behavior

### 9.4 Inventory tests

- Peak window computation edge cases
- Reservation/release consistency

### 9.5 Checkout/webhook tests

- Signature verification fail path
- Idempotency replay path
- Order creation only on confirmed payment

## 10. Frontend Workflow (Manager-friendly UI)

Current pattern in `apps/web`:

- `/create-user`: create account
- `/login`: sign in
- Session persisted in local storage
- Admin pages gated by session and role

Production recommendation:

- Move to httpOnly cookie sessions when possible
- Keep frontend role checks for UX only
- Backend remains source of truth for permissions

## 11. Backend Workflow (Operational)

For each new endpoint:

1. Define DTOs and validation.
2. Define auth requirements (`JwtAuthGuard`, `RolesGuard`).
3. Implement service logic.
4. Add persistence operations.
5. Add tests.
6. Add logging/audit where mutation occurs.
7. Update API docs and frontend contract.

## 12. Professional Guidelines For This Project

- Keep modules cohesive by domain (`auth`, `users`, `products`, etc.).
- Never put business logic in controllers.
- Never trust client role claims without token verification.
- Do not return inconsistent error shapes.
- Add acceptance criteria before implementation.
- Prefer small safe changes with tests over large rewrites.

## 13. Documentation and Learning References

NestJS:

- Fundamentals: https://docs.nestjs.com/
- Guards: https://docs.nestjs.com/guards
- Auth: https://docs.nestjs.com/security/authentication
- Authorization: https://docs.nestjs.com/security/authorization
- Validation: https://docs.nestjs.com/techniques/validation
- Config: https://docs.nestjs.com/techniques/configuration
- Testing: https://docs.nestjs.com/fundamentals/testing

TypeScript:

- Handbook: https://www.typescriptlang.org/docs/

Prisma:

- Docs: https://www.prisma.io/docs

Security references:

- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/

## 14. Review Protocol (Teacher/Supervisor Mode)

When you finish any section, submit exactly:

1. Section name
2. Files changed
3. What requirement IDs were addressed (example: `FR-Auth-001`, `FR-Admin-007`)
4. Test evidence
5. Open risks/questions

Then request review.

I will review strictly in this order:

1. Security correctness
2. Behavioral correctness
3. Reliability/performance implications
4. Maintainability/readability
5. Test completeness

## 15. Immediate Next Action

Start with **Section 1: Configuration and environment hardening**.

Reason:

- It protects every other section from hidden runtime failures.
- It is the highest leverage production step after your current auth/admin baseline.

## 16. Current Build Audit (Checked)

This audit reflects your current implementation state and is used to pick the next best features.

### 16.1 What is implemented well

- JWT strategy with bearer extraction and active-user validation in `apps/api/src/auth/strategy/jwt.strategy.ts`.
- Role guard with metadata-based checks in `apps/api/src/auth/guard/roles.guard.ts`.
- Admin product routes protected by `JwtAuthGuard + RolesGuard` in `apps/api/src/products/products.controller.ts`.
- Password hashing at user creation in `apps/api/src/user/user.service.ts`.
- Frontend API client abstraction (`apiFetchJson`) with retries/timeouts and standardized auth handling in `apps/web/src/features/api/api-fetch.ts`.
- Frontend auth flow (login/session/redirect) and admin UI foundation components (drawer, table, toasts, layout).

### 16.2 Risks and gaps to fix next

- Env secrets are still dual-source (`JWT_SECRET` and `Secret_JWT`) and not centrally validated at startup.
- Auth brute-force protection is missing (rate limit + lockout policy).
- Error shape is not globally standardized yet (no global exception filter strategy documented/implemented).
- Automated auth matrix tests (401/403/200) are not yet part of CI.
- Session security is still localStorage-based; cookie-session path is not implemented.

## 17. Next Feature Plan (From Current State)

Use this plan in order. Each item tells you: what to build, which feature to use, why it helps, and what to read.

### 17.1 Feature A: Central Config and Env Validation

Build this now:

- Add a dedicated config module with typed environment parsing.
- Require `JWT_SECRET` (single canonical variable).
- Remove runtime ambiguity from `Secret_JWT` fallback in production.

Use these NestJS features:

- `@nestjs/config` module.
- Validation schema (`joi` or `zod`) at bootstrap.

Why this helps:

- Fail-fast startup prevents hidden production misconfiguration.
- One source of truth improves maintainability and deployment safety.

TypeScript concept:

- Create typed config interfaces so services consume validated values instead of `process.env` strings.

Read more:

- Nest config: https://docs.nestjs.com/techniques/configuration
- Joi docs: https://joi.dev/
- Zod docs: https://zod.dev/

Review evidence to submit:

- Startup failure when `JWT_SECRET` is missing.
- Startup success when present.

### 17.2 Feature B: Auth Rate Limiting and Lockout

Build this after Feature A:

- Add login endpoint throttling and failed-attempt lockout policy.
- Track failed attempts by identity (email/IP strategy) and cooldown windows.

Use these NestJS features:

- `@nestjs/throttler` guard/decorator.
- Optional Redis store if you need distributed rate limits later.

Why this helps:

- Reduces brute-force risk on `POST /auth/login`.
- Moves security from best-effort to enforceable policy.

TypeScript concept:

- Model lockout state with clear types (`attemptCount`, `lockedUntil`, `lastAttemptAt`).

Read more:

- Nest rate limiting: https://docs.nestjs.com/security/rate-limiting
- OWASP auth cheat sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

Review evidence to submit:

- Repeated bad logins trigger throttling/lock.
- Legit login works after cooldown.

### 17.3 Feature C: Global Exception Contract

Build this next:

- Add a global exception filter that returns one consistent error shape.
- Normalize validation, auth, and service errors.

Use these NestJS features:

- Exception filters (`@Catch`, `ExceptionFilter`).
- Optional response interceptor for success envelopes (if needed).

Why this helps:

- Frontend can rely on stable error parsing.
- Faster debugging and cleaner logs.

TypeScript concept:

- Define shared error DTO type (`code`, `message`, `details`, `requestId`).

Read more:

- Nest exception filters: https://docs.nestjs.com/exception-filters
- Nest interceptors: https://docs.nestjs.com/interceptors

Review evidence to submit:

- Error payload examples for 400/401/403/500.

### 17.4 Feature D: Automated Auth + RBAC E2E Matrix

Build this before adding more business features:

- Add E2E tests for auth and admin authorization matrix.

Use these NestJS/testing features:

- `@nestjs/testing` + `supertest`.
- Test fixtures for admin and non-admin users.

Why this helps:

- Prevents regressions in your highest-risk security flows.

TypeScript concept:

- Use typed test factories/builders for deterministic data setup.

Read more:

- Nest testing: https://docs.nestjs.com/fundamentals/testing
- Supertest: https://github.com/ladjs/supertest

Required matrix:

- No token -> 401
- Invalid token -> 401
- Non-admin token on admin route -> 403
- Admin token on admin route -> 200

### 17.5 Feature E: Session Security Upgrade (Planned)

Build when auth core is stable:

- Move from localStorage token to secure httpOnly cookie sessions (or refresh-token strategy).
- Add CSRF protection for state-changing routes.

Use these concepts:

- Cookie security flags (`Secure`, `HttpOnly`, `SameSite`).
- CSRF token pattern for browser clients.

Why this helps:

- Reduces token theft risk from XSS scenarios.

Read more:

- OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

## 18. Supervisor Checkpoints (Send After Each Feature)

Send this after each completed feature:

1. Feature name (`A`, `B`, `C`, `D`, or `E`).
2. Files changed.
3. Test/verification evidence.
4. One risk you still see.

I will review and then unlock the next feature.
