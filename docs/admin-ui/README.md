# Admin UI Spec (Production Admin Console)

This spec is the source of truth for the Coffee Logic Admin UI in `apps/web`.

It describes:
- What the UI looks like (layout and patterns).
- What each screen does (flows, states, copy).
- How the UI maps to the existing backend endpoints.
- Reliability and admin-friendly behavior.

## Scope
- Frontend only (Next.js App Router).
- No new backend endpoints/modules in this iteration.
- No UI component libraries. The UI is implemented with React + Tailwind only.

## Goals
- Look and feel like real admin consoles: sidebar + top bar, table-first CRUD flows, dense but readable layout.
- Admin-friendly workflows: fast scanning, bulk-friendly actions, keyboard usability, consistent feedback.
- Fault-tolerant client: timeouts, safe JSON parsing, normalized errors, limited retries for idempotent GETs.
- Use all existing endpoints: `POST /auth/login`, `GET /health`, products CRUD under `/admin/products/*`, users under `/users`.

## Non-Goals (Current API Limits)
- Audit logs, role management, order management, inventory, and alerts require new endpoints.
- True server-side pagination/sorting requires backend support; UI uses client-side sorting for loaded rows.

## Routes / IA

Primary navigation:
- Dashboard: `/`
- Products: `/products`
- Users: `/users`

Login:
- `/login` (no admin chrome)

Legacy routes (kept for compatibility and redirected):
- `/add-product` -> `/products?new=1`
- `/manage-products` -> `/products`
- `/delete-products` -> `/products`
- `/create-user` -> `/users?new=1`

## Visual Direction (What "Real Admin" Means Here)
- Persistent chrome: left sidebar + top bar.
- Page header pattern: title, short subtitle, primary action on the right.
- Data density: tables are the default; cards are used only for quick KPIs.
- Clear states: loading skeletons, empty states with next-step CTA, error states with retry.
- Restraint: minimal color, strong hierarchy, consistent spacing, predictable controls.

## Global Behaviors

Session model:
- Session is a JWT stored in `localStorage`.
- Any `401` from API:
  - clear session
  - redirect to `/login`

Health pill:
- Poll `GET /health` periodically.
- States:
  - `ok` (green)
  - `unavailable` (red)
  - `loading` (neutral)

Networking:
- Single `apiFetchJson` wrapper for all API calls.
- AbortController timeout (default 12s).
- GET-only retry with exponential backoff (no retries for POST/PATCH/DELETE).

Feedback:
- Toasts for success/error.
- Confirm dialog for destructive actions (archive/delete).

## Screen Specs

### Login (`/login`)
Purpose:
- Authenticate and create a session.

UI:
- Email + password fields.
- Inline field errors (required, invalid email).
- Failure banner for API errors.

Behavior:
- Success: store session and navigate to `/`.
- Failure: show best-available message from API.

Endpoint:
- `POST /auth/login`

### Dashboard (`/`)
Purpose:
- Quick overview and shortcuts.

UI:
- KPI cards:
  - API health
  - Active products count
  - Users count (optional if API permits)
- Preview table:
  - First rows of products (name, roast, origin).

Endpoints:
- `GET /health`
- `GET /admin/products/list`
- `GET /users` (optional; requires token)

### Products (`/products`)
Purpose:
- Manage products end-to-end.

UI:
- Primary action: New product (drawer form).
- Secondary actions:
  - Export CSV (exports loaded rows)
  - Reset filters
- Filters:
  - `name` (search)
  - `roastLevel` (dropdown); also accept `roast` query param for compatibility
  - `grind`, `origin`, `process`, `caffeine` (text filters)
- Table:
  - Sticky header
  - Row actions menu: Edit, Archive
  - Optional bulk selection and bulk archive (calls DELETE per id)

Behavior:
- Create uses a drawer; on success toast + refetch list.
- Edit uses a drawer; PATCH sends only changed fields.
  - This is required because the list endpoint does not guarantee full product payload.
- Archive is confirmed; on success toast + remove/refetch.

Endpoints:
- `GET /admin/products/list`
- `POST /admin/products/add`
- `PATCH /admin/products/:id`
- `DELETE /admin/products/:id`

### Users (`/users`)
Purpose:
- List accounts and create users.

UI:
- Primary action: New user (drawer form).
- Secondary action: Export CSV.
- Search: client-side filter by email / first name / last name.
- Table: Email, First name, Last name, Role (if present), Created (if present).

Behavior:
- Create user validates required fields and shows password guidance.
- On success toast + refetch.

Endpoints:
- `GET /users`
- `POST /users`

## Data Contracts (UI Assumptions)

Product list items (from `GET /admin/products/list`):
- `id` (string)
- `name` (string)
- `roast` OR `roastLevel` (string, displayed as "Roast")
- `grind`, `origin`, `process`, `caffeine` (strings, may be empty)

User list items (from `GET /users`):
- `email` (string)
- `firstName`, `lastName` (strings, may be empty)
- `role` (string) if backend provides it

## Error Copy (Normalized)
- 401: "Please sign in again."
- 403: "You do not have permission to access this resource."
- Network/timeout: "Network error. Please retry."
- 5xx: "Request failed (5xx). Please retry."

## Accessibility Checklist
- Keyboard: tab order is predictable; focus ring is visible.
- Dialogs/drawers: focus trap, Escape to close, restore focus to trigger.
- Tables: semantic table markup, accessible row action buttons.
- Forms: labels for all inputs, inline errors, `aria-invalid` where applicable.
- Toasts: `role="status"` for non-blocking announcements.

## Endpoint Coverage Matrix

| Endpoint | Used by screen | UI action |
| --- | --- | --- |
| `POST /auth/login` | Login | Sign in |
| `GET /health` | Admin chrome | Health pill |
| `GET /admin/products/list` | Dashboard, Products | Load list/filter |
| `POST /admin/products/add` | Products | Create |
| `PATCH /admin/products/:id` | Products | Edit |
| `DELETE /admin/products/:id` | Products | Archive |
| `GET /users` | Dashboard (optional), Users | Load list |
| `POST /users` | Users | Create |

## Dev Setup
- Web: `pnpm dev:web` (defaults to `http://localhost:3000`)
- API: `pnpm dev:api` (defaults to `http://localhost:3001`)
- Frontend env:
  - `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:3001`)
