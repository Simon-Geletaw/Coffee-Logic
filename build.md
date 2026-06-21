Here is the phased engineering plan to complete the project.

══════════════════════════════════════════
PHASE 1 — REFACTOR AND COMPLETE PRODUCT MANAGEMENT
Goal: Establish a clean, fully functional, and robust product management module.
Estimated time: 2 hours
Dependencies: None
══════════════════════════════════════════

TASK 1.1 — Restructure Product Module Files
  File(s) to create or edit:
    - `apps/api/src/products/products.service.ts` (create)
    - `apps/api/src/products/products.service.spec.ts` (create)
    - `apps/api/src/product/product.service.ts` (delete)
    - `apps/api/src/product/product.service.spec.ts` (delete)
    - `apps/api/src/products/products.module.ts` (edit)
  What to do:
    - Move the content of `apps/api/src/product/product.service.ts` to a new file at `apps/api/src/products/products.service.ts`.
    - Move the content of `apps/api/src/product/product.service.spec.ts` to a new file at `apps/api/src/products/products.service.spec.ts`.
    - Update `apps/api/src/products/products.module.ts` to import `ProductService` from the new local path.
    - Delete the now-empty `apps/api/src/product/` directory.
  Acceptance criteria:
    - The API should run without errors after the file move.
    - All existing product-related API endpoints should function as before.
  Edge cases to handle:
    - Ensure all import paths in the moved files and in `products.module.ts` are correct.
  Do NOT:
    - Change any of the logic within the service file during the move.

TASK 1.2 — Implement Update Product Logic
  File(s) to create or edit:
    - `apps/api/src/products/products.service.ts`
    - `apps/api/src/products/dto/update-product.dto.ts` (create)
  What to do:
    - Create an `UpdateProductDto` that mirrors `CreateProductDto` but with all fields being optional.
    - Implement the `updateProduct` method in `ProductService`.
    - The method should take a product `id` and an `updateProductDto` as arguments.
    - It should find the product by its ID. If not found, throw a `NotFoundException`.
    - It should update the product's fields with the data from the DTO.
    - It should return the updated product object.
  Acceptance criteria:
    - Sending a `PATCH` request to `/admin/products/:id` with valid data updates the product in the database.
    - The API returns the updated product.
    - Sending a request for a non-existent product ID returns a 404 error.
  Edge cases to handle:
    - Partial updates (only some fields provided).
    - Empty request body.
  Do NOT:
    - Allow changing the product's `id`.

══════════════════════════════════════════
PHASE 2 — INVENTORY MANAGEMENT
Goal: Implement the core logic for tracking coffee inventory.
Estimated time: 3 hours
Dependencies: Phase 1
══════════════════════════════════════════

TASK 2.1 — Create Inventory Module
  File(s) to create or edit:
    - `apps/api/src/inventory/inventory.module.ts` (create)
    - `apps/api/src/inventory/inventory.controller.ts` (create)
    - `apps/api/src/inventory/inventory.service.ts` (create)
    - `apps/api/src/app.module.ts` (edit)
  What to do:
    - Create the basic structure for the `InventoryModule` using the NestJS CLI, or manually.
    - The `InventoryService` will handle the business logic for inventory management.
    - The `InventoryController` will expose endpoints for managing inventory.
    - Import the `InventoryModule` into the root `AppModule`.
  Acceptance criteria:
    - The new module is created and integrated into the application without breaking it.
  Edge cases to handle:
    - None for this task.
  Do NOT:
    - Implement any logic yet, just the boilerplate.

TASK 2.2 — Implement Inventory Logic
  File(s) to create or edit:
    - `apps/api/src/inventory/inventory.service.ts`
    - `apps/api/src/inventory/inventory.controller.ts`
  What to do:
    - In `InventoryService`, create methods to:
        - `getInventoryForBatch(batchId: string)`: Returns the inventory for a specific batch.
        - `updateInventory(batchId: string, onHand: number, reserved: number)`: Updates the inventory for a batch.
    - In `InventoryController`, create endpoints that map to these service methods. Secure them for `admin` users.
  Acceptance criteria:
    - Able to get and update inventory for a batch via API calls.
  Edge cases to handle:
    - Batch not found.
    - Negative inventory values.
  Do NOT:
    - Connect this to the ordering process yet.
══════════════════════════════════════════
PHASE 3 — DATABASE SCHEMA AND MIGRATIONS
Goal: Finalize the database schema and create initial seed data.
Estimated time: 2 hours
Dependencies: None
══════════════════════════════════════════

TASK 3.1 — Review and Finalize Prisma Schema
  File(s) to create or edit:
    - `prisma/schema.prisma`
  What to do:
    - Review the existing `schema.prisma` file for any inconsistencies or missing fields.
    - Ensure all relations between models are correctly defined.
    - Add any missing indexes for frequently queried columns (e.g., `email` on `User`, `sku` on `ProductVariant`).
  Acceptance criteria:
    - The Prisma schema is complete and accurately reflects the data model.
    - Running `npx prisma validate` passes without errors.
  Edge cases to handle:
    - Consider if any fields should be unique.
  Do NOT:
    - Make any breaking changes to existing models that would cause data loss without a clear migration path.

TASK 3.2 — Create Seed Data
  File(s) to create or edit:
    - `prisma/seed.ts` (create)
    - `package.json` (edit)
  What to do:
    - Create a `seed.ts` file to populate the database with initial data.
    - Add a script to `package.json` to run the seed script (e.g., `"prisma:seed": "ts-node prisma/seed.ts"`).
    - Create at least one admin user.
    - Create a few sample products with variants.
  Acceptance criteria:
    - Running the seed script populates the database with the specified data.
  Edge cases to handle:
    - Ensure the script is idempotent (can be run multiple times without creating duplicate data).
  Do NOT:
    - Include any sensitive data in the seed script.

══════════════════════════════════════════
PHASE 4 — API DEVELOPMENT
Goal: Build out the remaining core API functionality for orders and subscriptions.
Estimated time: 6 hours
Dependencies: Phase 1, Phase 2, Phase 3
══════════════════════════════════════════

TASK 4.1 — Implement Order Management Module
  File(s) to create or edit:
    - `apps/api/src/order/order.module.ts` (create)
    - `apps/api/src/order/order.controller.ts` (create)
    - `apps/api/src/order/order.service.ts` (create)
    - `apps/api/src/app.module.ts` (edit)
  What to do:
    - Create the `OrderModule` with a controller and service.
    - Implement methods in `OrderService` for:
        - `createOrder(userId: string, items: OrderItemDto[])`
        - `getOrderById(orderId: string)`
        - `getOrdersForUser(userId: string)`
        - `updateOrderStatus(orderId: string, status: OrderStatus)`
    - Create corresponding endpoints in `OrderController`.
    - Integrate the `OrderModule` into the main `AppModule`.
  Acceptance criteria:
    - Users can create and view their orders.
    - Admins can view and manage all orders.
  Edge cases to handle:
    - Insufficient inventory when creating an order.
    - Invalid product IDs.
  Do NOT:
    - Process payments in this task.

TASK 4.2 — Implement Subscription Management Module
  File(s) to create or edit:
    - `apps/api/src/subscription/subscription.module.ts` (create)
    - `apps/api/src/subscription/subscription.controller.ts` (create)
    - `apps/api/src/subscription/subscription.service.ts` (create)
    - `apps/api/src/app.module.ts` (edit)
  What to do:
    - Create the `SubscriptionModule`.
    - Implement methods in `SubscriptionService` for:
        - `createSubscription(...)`
        - `getSubscriptionById(...)`
        - `updateSubscriptionStatus(...)`
        - `cancelSubscription(...)`
  Acceptance criteria:
    - Users can create and manage their subscriptions.
  Edge cases to handle:
    - Payment failures for recurring charges.
  Do NOT:
    - Implement the full Stripe integration yet. This will be handled in a later phase.
