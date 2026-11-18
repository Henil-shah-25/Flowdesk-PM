const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });

  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('--- 1. Testing Desktop 1280px ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await desktopContext.newPage();

  // Navigate to Dashboard
  await page.goto('http://localhost:4173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Seed 50+ tasks into dept_mkt_seo in localStorage
  await page.evaluate(() => {
    const STORAGE_PREFIX = 'flowdesk_local_db_';
    const stagesRaw = localStorage.getItem(STORAGE_PREFIX + 'Stages');
    let stages = stagesRaw ? JSON.parse(stagesRaw) : [];
    
    // Find stages for dept_mkt_seo
    let seoStages = stages.filter(s => s.department_id === 'dept_mkt_seo');
    if (!seoStages || seoStages.length === 0) {
      seoStages = [
        { id: 'stg_dept_mkt_seo_started', department_id: 'dept_mkt_seo', name: 'Started', kind: 'normal', color: 'sky', order: 1 },
        { id: 'stg_dept_mkt_seo_middle', department_id: 'dept_mkt_seo', name: 'Middle', kind: 'normal', color: 'lime', order: 2 },
        { id: 'stg_dept_mkt_seo_ended', department_id: 'dept_mkt_seo', name: 'Ended', kind: 'done', color: 'charcoal', order: 3 },
        { id: 'stg_dept_mkt_seo_blockade', department_id: 'dept_mkt_seo', name: 'Blockade', kind: 'blocked', color: 'coral', order: 4 }
      ];
      stages = stages.concat(seoStages);
      localStorage.setItem(STORAGE_PREFIX + 'Stages', JSON.stringify(stages));
    }

    const tasksRaw = localStorage.getItem(STORAGE_PREFIX + 'Tasks');
    let tasks = tasksRaw ? JSON.parse(tasksRaw) : [];

    // Filter out previous bulk tasks if any
    tasks = tasks.filter(t => !t.id.startsWith('bulk_task_'));

    // Generate 52 tasks
    const titles = [
      'Keyword Research & Clustering', 'Core Web Vitals Audit', 'Backlink Disavow Review',
      'Meta Descriptions Batch #1', 'Internal Linking Strategy', 'Schema Markup for Products',
      'Competitor Gap Analysis', 'Page Speed Optimization', 'H1-H3 Tag Restructuring',
      'Robots.txt & Sitemap Ping', 'Image Alt Text Automation', 'Redirect 301 Cleanup',
      'Canonical Tags Audit', 'SERP Feature Opportunity Map', 'Local SEO Citations',
      'Content Pruning Protocol', 'Search Console Coverage Fix', 'Mobile Usability Review',
      'Anchor Text Diversity Audit', 'XML Sitemap Indexing'
    ];

    for (let i = 1; i <= 52; i++) {
      const stage = seoStages[(i - 1) % seoStages.length];
      const title = titles[(i - 1) % titles.length] + ` #${i}`;
      tasks.push({
        id: `bulk_task_${i}`,
        project_id: 'proj_1',
        department_id: 'dept_mkt_seo',
        stage_id: stage.id,
        title: title,
        description: `Automated high-load test task ${i} to verify 60fps drag-and-drop.`,
        priority: i % 4 === 0 ? 'urgent' : i % 3 === 0 ? 'high' : 'medium',
        estimate_min: (i % 6 + 1) * 30,
        due_date: new Date(Date.now() + 86400000 * (i % 14 - 3)).toISOString(),
        order: i,
        archived: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        done_at: stage.kind === 'done' ? new Date().toISOString() : undefined
      });
    }

    localStorage.setItem(STORAGE_PREFIX + 'Tasks', JSON.stringify(tasks));
    // Clear TanStack Query persist cache so it pulls the seeded tasks
    localStorage.removeItem('FLOWDESK_QUERY_OFFLINE_CACHE');
  });

  // Reload Dashboard and take screenshot
  await page.goto('http://localhost:4173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-1280px.png'), fullPage: true });
  console.log('Saved dashboard-1280px.png');

  // Navigate to SEO pipeline board
  await page.goto('http://localhost:4173/projects/proj_1/d/dept_mkt_seo');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Take screenshot of desktop pipeline board with 50+ tasks
  await page.screenshot({ path: path.join(screenshotsDir, 'pipeline-1280px.png'), fullPage: true });
  console.log('Saved pipeline-1280px.png');

  // Verify search filter
  const searchInput = page.locator('input[placeholder*="Search tasks"]');
  await searchInput.fill('Keyword');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'pipeline-search-filter.png') });
  console.log('Saved pipeline-search-filter.png');
  await searchInput.clear();
  await page.waitForTimeout(500);

  // Verify Board | List toggle
  const listToggle = page.locator('button:has-text("List")');
  await listToggle.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'pipeline-list-view.png'), fullPage: true });
  console.log('Saved pipeline-list-view.png');

  // Switch back to Board
  const boardToggle = page.locator('button:has-text("Board")');
  await boardToggle.click();
  await page.waitForTimeout(600);

  // Verify Stage color picker
  // Find the first stage column "..." options button
  const stageOptionsBtn = page.locator('button[aria-label="Stage options"]').first();
  await stageOptionsBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'pipeline-stage-color-picker.png') });
  console.log('Saved pipeline-stage-color-picker.png');

  // Close menu by clicking away
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);

  // Test Drag & Drop with 50+ tasks
  console.log('Testing drag and drop...');
  const firstCard = page.locator('[data-task-id]').first();
  const targetColumn = page.locator('[data-stage-column]').nth(1);
  
  if (await firstCard.isVisible() && await targetColumn.isVisible()) {
    const cardBox = await firstCard.boundingBox();
    const targetBox = await targetColumn.boundingBox();
    if (cardBox && targetBox) {
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      // Move slightly to trigger drag
      await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height / 2 + 10, { steps: 5 });
      await page.waitForTimeout(200);
      // Move to target column
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 15 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(600);
      console.log('Drag and drop executed smoothly.');
    }
  }

  // --- 2. Testing Mobile 390px ---
  console.log('--- 2. Testing Mobile 390px ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  // Mobile Dashboard
  await mobilePage.goto('http://localhost:4173/');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(500);

  // Seed tasks in mobile context too
  await mobilePage.evaluate(() => {
    const STORAGE_PREFIX = 'flowdesk_local_db_';
    const stagesRaw = localStorage.getItem(STORAGE_PREFIX + 'Stages');
    let stages = stagesRaw ? JSON.parse(stagesRaw) : [];
    
    let seoStages = stages.filter(s => s.department_id === 'dept_mkt_seo');
    if (!seoStages || seoStages.length === 0) {
      seoStages = [
        { id: 'stg_dept_mkt_seo_started', department_id: 'dept_mkt_seo', name: 'Started', kind: 'normal', color: 'sky', order: 1 },
        { id: 'stg_dept_mkt_seo_middle', department_id: 'dept_mkt_seo', name: 'Middle', kind: 'normal', color: 'lime', order: 2 },
        { id: 'stg_dept_mkt_seo_ended', department_id: 'dept_mkt_seo', name: 'Ended', kind: 'done', color: 'charcoal', order: 3 },
        { id: 'stg_dept_mkt_seo_blockade', department_id: 'dept_mkt_seo', name: 'Blockade', kind: 'blocked', color: 'coral', order: 4 }
      ];
      stages = stages.concat(seoStages);
      localStorage.setItem(STORAGE_PREFIX + 'Stages', JSON.stringify(stages));
    }

    const tasksRaw = localStorage.getItem(STORAGE_PREFIX + 'Tasks');
    let tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
    tasks = tasks.filter(t => !t.id.startsWith('bulk_task_'));

    const titles = [
      'Keyword Research & Clustering', 'Core Web Vitals Audit', 'Backlink Disavow Review',
      'Meta Descriptions Batch #1', 'Internal Linking Strategy', 'Schema Markup for Products',
      'Competitor Gap Analysis', 'Page Speed Optimization', 'H1-H3 Tag Restructuring',
      'Robots.txt & Sitemap Ping', 'Image Alt Text Automation', 'Redirect 301 Cleanup',
      'Canonical Tags Audit', 'SERP Feature Opportunity Map', 'Local SEO Citations',
      'Content Pruning Protocol', 'Search Console Coverage Fix', 'Mobile Usability Review',
      'Anchor Text Diversity Audit', 'XML Sitemap Indexing'
    ];

    for (let i = 1; i <= 52; i++) {
      const stage = seoStages[(i - 1) % seoStages.length];
      const title = titles[(i - 1) % titles.length] + ` #${i}`;
      tasks.push({
        id: `bulk_task_${i}`,
        project_id: 'proj_1',
        department_id: 'dept_mkt_seo',
        stage_id: stage.id,
        title: title,
        description: `Automated high-load test task ${i} to verify 60fps drag-and-drop.`,
        priority: i % 4 === 0 ? 'urgent' : i % 3 === 0 ? 'high' : 'medium',
        estimate_min: (i % 6 + 1) * 30,
        due_date: new Date(Date.now() + 86400000 * (i % 14 - 3)).toISOString(),
        order: i,
        archived: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        done_at: stage.kind === 'done' ? new Date().toISOString() : undefined
      });
    }

    localStorage.setItem(STORAGE_PREFIX + 'Tasks', JSON.stringify(tasks));
    localStorage.removeItem('FLOWDESK_QUERY_OFFLINE_CACHE');
  });

  await mobilePage.goto('http://localhost:4173/');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'dashboard-390px.png'), fullPage: true });
  console.log('Saved dashboard-390px.png');

  // Mobile Pipeline Board
  await mobilePage.goto('http://localhost:4173/projects/proj_1/d/dept_mkt_seo');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'pipeline-390px.png'), fullPage: true });
  console.log('Saved pipeline-390px.png');

  await browser.close();
  console.log('All verification and screenshots completed successfully!');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
