import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should display dashboard without authentication', async ({ page }) => {
    await page.goto('/');

    // Should stay on dashboard (no redirect)
    await expect(page).toHaveURL('/');

    // Check header is visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Advenoh Status')).toBeVisible();

    // Check navigation links
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
  });
});

test.describe('History Page', () => {
  test('should display history page without authentication', async ({ page }) => {
    await page.goto('/history');

    // Should stay on history page (no redirect)
    await expect(page).toHaveURL('/history');

    // Check page title
    await expect(page.getByText('Uptime History')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between dashboard and history', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Click History link
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');

    // Click Dashboard link
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('404 Page', () => {
  test('should display 404 for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-page');

    await expect(page.locator('h1')).toContainText('404');
    await expect(page.getByRole('link', { name: 'Go back home' })).toBeVisible();
  });
});
