const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Taking screenshot of Dashboard page...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for content to load (use a more flexible selector)
    await page.waitForTimeout(3000);

    const dashboardPath = path.join(__dirname, 'screenshot_dashboard.png');
    await page.screenshot({
      path: dashboardPath,
      fullPage: true
    });
    console.log(`✓ Dashboard screenshot saved: ${dashboardPath}`);

    // Check for 90 Day Uptime section
    const uptimeText = await page.textContent('body');
    const has90DayUptime = uptimeText.includes('90 Day Uptime') || uptimeText.includes('90-Day Uptime');
    console.log(`  - 90 Day Uptime grid: ${has90DayUptime ? '✓ Found' : '✗ Not found'}`);

    console.log('\nTaking screenshot of History page...');
    await page.goto('http://localhost:3000/history', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    const historyPath = path.join(__dirname, 'screenshot_history.png');
    await page.screenshot({
      path: historyPath,
      fullPage: true
    });
    console.log(`✓ History screenshot saved: ${historyPath}`);

    // Check for Status History and December 2025
    const historyText = await page.textContent('body');
    const hasStatusHistory = historyText.includes('Status History') || historyText.includes('History');
    const hasDecember2025 = historyText.includes('December') && historyText.includes('2025');
    const hasDate = historyText.includes('2025-12-09') || historyText.includes('Dec 9') || historyText.includes('12/9');

    console.log(`  - Status History page: ${hasStatusHistory ? '✓ Found' : '✗ Not found'}`);
    console.log(`  - December 2025 calendar: ${hasDecember2025 ? '✓ Found' : '✗ Not found'}`);
    console.log(`  - Today's date (2025-12-09): ${hasDate ? '✓ Found' : '✗ Not found'}`);

  } catch (error) {
    console.error('Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
