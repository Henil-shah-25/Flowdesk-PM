const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // 1. DESKTOP 1280px
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing Desktop 1280px ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await desktopContext.newPage();

  // Navigate to Calendar
  await page.goto('http://localhost:4173/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take Month View Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'calendar-1280px.png'), fullPage: true });
  console.log('Saved calendar-1280px.png');

  // Switch to Week View
  const weekBtn = page.locator('button:has-text("Week")');
  await weekBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'calendar-week-1280px.png'), fullPage: true });
  console.log('Saved calendar-week-1280px.png');

  // Switch back to Month View
  const monthBtn = page.locator('button:has-text("Month")');
  await monthBtn.click();
  await page.waitForTimeout(500);

  // Click on a day with tasks or "+ more" to test Day Detail Modal
  const dayCell = page.locator('.group.relative.rounded-\\[20px\\]').filter({ hasText: /\d+/ }).nth(15);
  await dayCell.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'calendar-day-modal-1280px.png') });
  console.log('Saved calendar-day-modal-1280px.png');

  // Close modal with Escape or clicking close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Navigate to Reports Page
  await page.goto('http://localhost:4173/reports');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Take Reports Main Page Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'reports-1280px.png'), fullPage: true });
  console.log('Saved reports-1280px.png');

  // Test expanding a panel (e.g. Panel 1 Tasks by Department)
  const expandDeptChartBtn = page.locator('button[aria-label="Expand department chart"]');
  await expandDeptChartBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'reports-detail-modal-1280px.png') });
  console.log('Saved reports-detail-modal-1280px.png');

  // Close detail modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Test "Report" button from a project detail page
  await page.goto('http://localhost:4173/projects/proj_1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const reportBtn = page.locator('button:has-text("Report")').first();
  await reportBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  console.log('Navigated from project to reports with URL:', page.url());

  // ---------------------------------------------------------------------------
  // 2. MOBILE 390px
  // ---------------------------------------------------------------------------
  console.log('--- 2. Testing Mobile 390px ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  // Mobile Calendar
  await mobilePage.goto('http://localhost:4173/calendar');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'calendar-390px.png'), fullPage: true });
  console.log('Saved calendar-390px.png');

  // Tap on a day cell to test mobile bottom sheet
  const mobileDay = mobilePage.locator('.group.relative.rounded-\\[20px\\]').filter({ hasText: /\d+/ }).nth(15);
  await mobileDay.click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'calendar-bottom-sheet-390px.png') });
  console.log('Saved calendar-bottom-sheet-390px.png');

  await mobilePage.keyboard.press('Escape');
  await mobilePage.waitForTimeout(400);

  // Mobile Reports
  await mobilePage.goto('http://localhost:4173/reports');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1200);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'reports-390px.png'), fullPage: true });
  console.log('Saved reports-390px.png');

  await browser.close();
  console.log('All Calendar & Reports verification completed successfully!');
}

run().catch((err) => {
  console.error('Error in Playwright script:', err);
  process.exit(1);
});
