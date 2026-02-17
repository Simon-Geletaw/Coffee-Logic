# 06 — Security & Compliance

Network & transport
- TLS everywhere, enforced via load balancers/CDN. Use automatic certificate rotation (ACM / managed certs).
- Restrict management ports and use bastion hosts / private endpoints for DB and admin panels.

Application security
- WAF for public endpoints and rate limiting on APIs (IP/user throttling).
- Use CSP, X-Frame-Options, HSTS, and secure cookie flags site-wide.
- Input validation and parameterized queries; prevent injection (SQL, script) by design.

Payments & PCI
- Use Stripe Payment Intents and hosted components (Elements) to keep card data out of the stack.
- Secure webhooks: validate signatures, use idempotency keys, log webhook receipts, and verify reproducible state changes.

Data protection & privacy
- PII minimization: store only fields necessary for business. Encrypt sensitive columns at rest if required.
- Data retention policy and export/delete workflows for GDPR compliance.

Secrets management
- Store secrets in cloud secret stores (Key Vault / Secrets Manager) and mount or inject at runtime.
- Rotate keys and audit access; use short-lived credentials where possible.

Incident response
- Maintain runbook for payment outages, inventory mismatches, and checkout failures.
- Integrate Sentry and PagerDuty for high-severity alerts and run regular fire-drills.

Third-party risk
- Review Stripe, Elasticsearch, and hosting provider SLAs. Keep plan B options for critical services (e.g., OpenSearch fallback).
