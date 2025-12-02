import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page.locator('h1')).toContainText('Advenoh Status');

    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
  });

  test('should show error for empty form submission', async ({ page }) => {
    await page.goto('/login');

    // HTML5 validation should prevent empty submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
  });
});

test.describe('Authentication Redirect', () => {
  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should redirect unauthenticated users from history to login', async ({ page }) => {
    await page.goto('/history');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
});

test.describe('404 Page', () => {
  test('should display 404 for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-page');

    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('a')).toContainText('Go back home');
  });
});
