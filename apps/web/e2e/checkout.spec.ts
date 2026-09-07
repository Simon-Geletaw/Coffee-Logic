import { expect, test, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';

/**
 * Drives the fake provider's webhook the way Stripe/Chapa would, minus the
 * signature (the fake accepts `x-fake-signature: fake`). Requires the API to
 * run with PAYMENTS_FAKE=true.
 */
async function settleFakePayment(page: Page, orderId: string, type: 'paid' | 'failed') {
  const response = await page.request.post(`${API}/payments/fake/webhook`, {
    headers: { 'x-fake-signature': 'fake', 'content-type': 'application/json' },
    data: { providerRef: `fake_${orderId}`, type, eventId: `e2e-${orderId}-${type}-${Date.now()}` },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('shop → cart → checkout → paid', () => {
  test('a shopper can buy a coffee end to end', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/coffee/i);

    // First card: pick the first size and add it.
    const firstCard = page.locator('article').first();
    await firstCard.getByRole('button', { name: /add to cart/i }).click();
    await expect(page.getByText(/added to cart/i)).toBeVisible();

    // Badge reflects the server cart.
    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/ready when you are/i);
    await expect(page.getByText(/^shipping/i)).toBeVisible();

    await page.getByRole('link', { name: /^checkout$/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel(/full name/i).fill('Selam Tadesse');
    await page.getByLabel(/^email/i).fill('selam@example.com');
    await page.getByLabel(/shipping address/i).fill('Bole, Addis Ababa, near Edna Mall, 3rd floor');

    await page.getByRole('button', { name: /continue to payment/i }).click();

    // The fake provider "redirects" straight to the return page.
    await expect(page).toHaveURL(/\/checkout\/return\?order=/);
    const orderId = new URL(page.url()).searchParams.get('order');
    expect(orderId).toBeTruthy();

    await expect(page.getByText(/confirming payment/i)).toBeVisible();

    // Simulate the provider's webhook, then watch the page notice.
    await settleFakePayment(page, orderId as string, 'paid');
    await expect(page.getByText(/payment received/i)).toBeVisible({ timeout: 15_000 });

    // Lands on the receipt; the cart is now empty.
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}`), { timeout: 15_000 });
    await expect(page.getByText(/order received/i)).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/nothing here yet/i);
  });

  test('a failed payment returns the shopper to an editable cart with a retry', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /add to cart/i }).click();
    await page.goto('/checkout');

    await page.getByLabel(/full name/i).fill('Selam Tadesse');
    await page.getByLabel(/^email/i).fill('selam@example.com');
    await page.getByLabel(/shipping address/i).fill('Bole, Addis Ababa, near Edna Mall, 3rd floor');
    await page.getByRole('button', { name: /continue to payment/i }).click();

    await expect(page).toHaveURL(/\/checkout\/return\?order=/);
    const orderId = new URL(page.url()).searchParams.get('order') as string;

    await settleFakePayment(page, orderId, 'failed');
    await expect(page.getByText(/payment not completed/i)).toBeVisible({ timeout: 15_000 });

    await page.goto('/cart');
    await expect(page.getByRole('alert')).toContainText(/payment not completed/i);
    await expect(page.getByRole('link', { name: /try payment again/i })).toBeVisible();
    // Lines are editable again.
    await expect(page.getByRole('button', { name: /increase/i }).first()).toBeEnabled();
  });

  test('the cart is locked while a payment is pending', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /add to cart/i }).click();
    await page.goto('/checkout');

    await page.getByLabel(/full name/i).fill('Selam Tadesse');
    await page.getByLabel(/^email/i).fill('selam@example.com');
    await page.getByLabel(/shipping address/i).fill('Bole, Addis Ababa, near Edna Mall, 3rd floor');
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await expect(page).toHaveURL(/\/checkout\/return\?order=/);

    await page.goto('/cart');
    await expect(page.getByRole('status')).toContainText(/payment in progress/i);
    await expect(page.getByRole('button', { name: /increase/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /check payment status/i })).toBeVisible();
  });
});
