import { test, expect } from '@playwright/test';

test.describe('Admin Page - Unauthenticated Access', () => {
  test('should redirect to login page when accessing admin without authentication', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to home with enable_login=true
    await expect(page).toHaveURL('/?enable_login=true');
  });
});

test.describe('Admin Page - Authenticated Access', () => {
  // These tests require authentication setup
  // For now, we test the basic UI structure
  test.skip('should display admin page layout when authenticated', async ({ page }) => {
    // This test would require setting up authenticated session
    await page.goto('/admin');

    // Check sidebar is visible
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('Service Management')).toBeVisible();

    // Check page title
    await expect(page.getByRole('heading', { name: 'Service Management' })).toBeVisible();

    // Check Add Service button
    await expect(page.getByRole('button', { name: 'Add Service' })).toBeVisible();
  });

  test.skip('should show service form modal when Add Service is clicked', async ({ page }) => {
    await page.goto('/admin');

    // Click Add Service button
    await page.getByRole('button', { name: 'Add Service' }).click();

    // Check modal is visible
    await expect(page.getByRole('heading', { name: 'Add Service' })).toBeVisible();

    // Check form fields
    await expect(page.getByLabel('Service Name')).toBeVisible();
    await expect(page.getByLabel('URL')).toBeVisible();
    await expect(page.getByLabel('Threshold (ms)')).toBeVisible();

    // Check buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test.skip('should validate URL format in service form', async ({ page }) => {
    await page.goto('/admin');

    // Open add form
    await page.getByRole('button', { name: 'Add Service' }).click();

    // Fill invalid URL
    await page.getByLabel('Service Name').fill('Test Service');
    await page.getByLabel('URL').fill('invalid-url');
    await page.getByRole('button', { name: 'Save' }).click();

    // Should show validation error
    await expect(page.getByText('Please enter a valid URL format')).toBeVisible();
  });

  test.skip('should close modal when Cancel is clicked', async ({ page }) => {
    await page.goto('/admin');

    // Open add form
    await page.getByRole('button', { name: 'Add Service' }).click();

    // Verify modal is open
    await expect(page.getByRole('heading', { name: 'Add Service' })).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should be closed
    await expect(page.getByRole('heading', { name: 'Add Service' })).not.toBeVisible();
  });
});

test.describe('Header Admin Link', () => {
  test('should not show Admin link when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Admin link should not be visible
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  });

  test.skip('should show Admin link when authenticated', async ({ page }) => {
    // This test would require setting up authenticated session
    await page.goto('/');

    // Admin link should be visible
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

    // Click Admin link
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL('/admin');
  });
});
