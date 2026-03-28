# Admin Panel Security-First Rewrite Plan

Date: 2026-03-17
Scope: Remove current frontend pages and rebuild a focused admin panel in apps/web using existing API endpoints.
Priority: Security first, then usability and maintainability.

## 1) Current API Surface (Source of Truth)

- POST /auth/login
  - Purpose: admin authentication
  - Request: { email, password }
  - Response: { code, message, token? }

- GET /admin/products/list
  - Guarded by JWT + admin role on backend
  - Query: roastLevel|roast, grind, origin, caffeine, name, process

- POST /admin/products/add
  - Guarded by JWT + admin role

- PATCH /admin/products/:id
  - Guarded by JWT + admin role

- DELETE /admin/products/:id
  - Guarded by JWT + admin role

- GET /users
  - Guarded by JWT

- POST /users
  - Not guarded currently (backend issue to fix in next backend sprint)

## 2) Security Design Principles (Research-Informed)

Based on OWASP REST Security and Authorization guidance:

- Deny by default in UI routing:
  - All admin routes require session token.
  - Role gate on client for UX only; backend remains enforcement authority.

- Validate authorization on every API request:
  - Always send Authorization Bearer token.
  - On 401/403, clear session and force re-login.

- Least privilege UX:
  - Show only admin pages required for operations.
  - Hide create/update/delete actions when role is not admin.

- Safe failure behavior:
  - Generic user-facing errors, no stack traces.
  - Unified API error handling.

- Input validation:
  - Validate forms at client edge before request.
  - Reject invalid payload shape/length early.

- Session safety:
  - Keep token in sessionStorage for reduced persistence.
  - Add idle/session expiry handling through JWT exp check.

- Security headers and caching:
  - Add CSP and no-store headers in Next config.
  - Prevent clickjacking and MIME sniffing.

- Audit-friendly frontend behavior:
  - Add request IDs in client logs (non-sensitive).
  - Avoid logging tokens or credentials.

## 3) Great Admin Page Blueprint (What It Should Have)

- Clear IA and low-friction navigation
  - Left navigation with explicit sections: Dashboard, Products, Users, Session.

- Actionable dashboard
  - KPI cards (total products, users, quick health check).
  - Quick actions for add product and refresh data.

- High-signal data tables
  - Search/filter controls with reset.
  - Dense, keyboard-friendly rows.
  - Inline row actions: edit, delete.

- Safe destructive actions
  - Confirm dialog with clear consequences.
  - Loading and disabled states to prevent double submission.

- Form quality
  - Strong validation with helpful errors.
  - Sanitized text inputs and bounded lengths.

- Responsive design
  - Usable mobile/desktop layout.
  - Touch-friendly controls and readable typography.

## 4) Rewrite Architecture

- Frontend platform
  - Next.js app router, React 19, TypeScript.

- State and networking
  - @tanstack/react-query for server state and cache invalidation.
  - Centralized secure fetch wrapper with timeout and auth headers.

- Validation
  - zod + react-hook-form + @hookform/resolvers.

- UI and accessibility
  - Radix primitives for dialog/toast.
  - lucide-react icons.

- Styling direction
  - Bold neutral palette (no purple bias).
  - Expressive typography and strong spacing rhythm.

## 5) Implementation Phases

Phase 1: Foundation
- Remove old pages/components under apps/web/src.
- Create new app layout, globals, providers, route guards.
- Add env config and API base utility.

Phase 2: Authentication and Session
- Implement login page using POST /auth/login.
- JWT payload decode for role/email/exp.
- Session store and logout controls.

Phase 3: Admin Data Modules
- Products page using list/add/update/delete admin endpoints.
- Users page using GET /users.
- Dashboard summary page.

Phase 4: Security Hardening
- Add security headers in next config.
- Add no-store policies and auth failure handling.
- Add safer error boundaries and fallback states.

Phase 5: Validation and Verification
- Build and lint web app.
- Manual API flow verification against backend.

## 6) Dependency Plan

Add dependencies:
- @tanstack/react-query
- react-hook-form
- zod
- @hookform/resolvers
- clsx
- lucide-react

## 7) Immediate Execution

Now executing:
- Phase 1 and Phase 2 immediately.
- Start core products and users pages from Phase 3.
