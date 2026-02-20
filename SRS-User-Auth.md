# **User & Auth**

## Overview
The User and Auth subsystem provides secure account access, session management, and address storage for checkout and subscriptions.

## Functional Requirements
- **FR-Auth-001** The system shall support sign-in using email/password and OAuth providers.
- **FR-Auth-002** The system shall maintain authenticated sessions for storefront, checkout, and account management.
- **FR-Auth-003** The system shall allow users to reset passwords via email-based token flow.
- **FR-Auth-004** The system shall allow users to manage a saved address book.
- **FR-Auth-005** The system shall protect sensitive actions with session validation and CSRF protection.
- **FR-Auth-006** The system shall allow users to sign out and invalidate active sessions.

## Acceptance Criteria
- **FR-Auth-001**
  - Users can sign in with valid credentials or OAuth.
  - Invalid credentials return a clear error message.
- **FR-Auth-002**
  - Sessions persist across browser reloads within the configured TTL.
  - Expired sessions require re-authentication.
- **FR-Auth-003**
  - Password reset emails include a single-use token with an expiry.
  - Password reset tokens cannot be reused.
- **FR-Auth-004**
  - Users can add, edit, and delete saved addresses.
  - At least one address can be marked as default.
- **FR-Auth-005**
  - State-changing requests require a valid session and CSRF token.
  - Failed validations do not change user data.
- **FR-Auth-006**
  - Signing out invalidates the active session token.
  - Signed-out sessions cannot access protected routes.

## Non-Functional Requirements
- Performance: auth endpoints respond within 300ms p95.
- Availability: auth services meet 99.9% monthly uptime.
- Security: passwords are hashed with a strong adaptive hash; session cookies are Secure and SameSite=Lax; authentication endpoints enforce rate limiting for failed sign-in attempts.
- Reliability: auth state changes are logged for security monitoring.
