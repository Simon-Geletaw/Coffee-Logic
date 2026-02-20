# 04 — Database, Search & Data Modeling

Primary DB: PostgreSQL
- Use managed Postgres (AWS RDS, Azure Database for PostgreSQL) for durability and backups.
- Core tables: `products`, `batches`, `inventory`, `users`, `orders`, `subscriptions`, `webhook_logs`, `audit_events`.
- Important fields: `batches.roast_date` (timestamp), `batches.batch_id`, `products.sensory_profile` (JSONB), `inventory.quantity`, `inventory.reserved`.

Who this is for
- Junior developers learning SQL and data modeling.

What you are building (simple)
- A database that stores products, orders, subscriptions, and inventory.
- A search method to filter products (starts simple, grows later).

Indexes & patterns
- Index `roast_date`, composite index on `(product_id, batch_id)`, GIN index on `sensory_profile` for JSONB queries.
- Consider `pg_trgm` for fuzzy text search (product descriptions) as a low-cost alternative to ES for MVP.

Beginner steps (schema changes)
1. Update the schema file (Prisma or SQL migrations).
2. Run migrations locally.
3. Verify tables and columns were created.
4. Add or update API code to use the new fields.

Search: Elasticsearch / OpenSearch
- Use Elasticsearch for faceted filtering (acidity, body, roast level), relevance ranking, and aggregations.
- Mapping: store sensory attributes as keyword/float fields; store `batch_id` and `roast_date` for freshness queries.
- Sync layer: use a change-data-capture (CDC) tool (Debezium) or application-level event emitter to keep ES in sync.

MVP search choice
- Default to `pg_trgm` for fast delivery; keep ES/OpenSearch as a Phase 2 upgrade if needed for scaling or richer facets.

Vector / semantic search (optional)
- If you add semantic matching or Recommendation systems, use a vector DB (Pinecone, Milvus) for similarity queries; compute embeddings during ingestion.

Data ownership & backups
- Nightly snapshots of Postgres and ES; continuous WAL archiving for Postgres to meet RTO/RPO targets.

Operational tips
- Use migrations (Prisma/Migrate or Flyway) and keep schema changes gated in PRs.
- Monitor DB connections to avoid bursts that cause connection exhaustion; use PgBouncer when scaling horizontally.

SRS alignment (MVP)
- FR-01/FR-02/FR-05 rely on `products`, `batches`, `inventory`, and freshness fields for visibility and filters.
- Audit and webhook logs support FR-Admin-006 and FR-CO-003 idempotency.

Build and run (junior-friendly)
- Start Postgres and Redis locally (Docker is recommended).
- Run migrations before starting the API.

Common beginner mistakes
- Changing the schema without adding a migration.
- Forgetting to update API code after schema changes.
