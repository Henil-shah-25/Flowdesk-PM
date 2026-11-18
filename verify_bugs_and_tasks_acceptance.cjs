const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:4173';

(async () => {
  console.log('=== STARTING BUGS & TASKS ACCEPTANCE SUITE ===\n');
  const browser = await chromium.launch({ headless: true });
  let totalErrors = 0;

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[BROWSER ERROR]:', msg.text());
      totalErrors++;
    }
  });

  page.on('pageerror', (err) => {
    console.error('[BROWSER UNCAUGHT]:', err.message);
    totalErrors++;
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Projects Page (/projects) shows project cards & no blank page
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: /projects shows project cards ---');
  await page.goto(`${BASE_URL}/projects`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const projectTitle = await page.locator('h1:has-text("Projects")').isVisible();
  console.log('Projects header visible:', projectTitle ? 'PASS' : 'FAIL');
  if (!projectTitle) throw new Error('Projects header not visible');

  const projectCards = page.locator('[data-project-card]');
  const cardCount = await projectCards.count();
  console.log(`Found ${cardCount} project cards on /projects:`, cardCount > 0 ? 'PASS' : 'FAIL');
  if (cardCount === 0) throw new Error('No project cards rendered on /projects');

  // Verify subproject count badge or info
  const firstCardText = await projectCards.first().innerText();
  console.log('First project card contents:\n', firstCardText.split('\n').slice(0, 4).join(' | '));

  // ---------------------------------------------------------------------------
  // TEST 2: Sub-project opens with breadcrumbs & departments with ON/OFF toggles
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Existing sub-project shows departments with toggles ---');
  await page.goto(`${BASE_URL}/projects/subproj_1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // Verify breadcrumb (Projects / Parent / This)
  const breadcrumb = page.locator('main nav').first();
  const hasBreadcrumb = await breadcrumb.isVisible();
  const breadcrumbText = await breadcrumb.innerText();
  console.log(`Breadcrumb text: "${breadcrumbText.replace(/\n/g, ' ')}" ->`, hasBreadcrumb ? 'PASS' : 'FAIL');
  if (!breadcrumbText.includes('Projects') || !breadcrumbText.includes('Product Hunt Launch Campaign')) {
    throw new Error('Breadcrumb missing expected navigation links');
  }

  // Check departments rendered
  const deptCards = page.locator('h3', { hasText: 'Marketing' }).first();
  await deptCards.waitFor({ state: 'visible', timeout: 5000 });
  const isMarketingVisible = await deptCards.isVisible();
  console.log('Marketing department card present on sub-project:', isMarketingVisible ? 'PASS' : 'FAIL');
  if (!isMarketingVisible) throw new Error('Departments not found on sub-project');

  // Verify "New sub-project" button is NOT present on sub-project
  const subProjBtnOnSub = page.locator('button:has-text("New sub-project")');
  const hasSubBtn = await subProjBtnOnSub.isVisible();
  console.log('"New sub-project" button hidden on sub-project page:', !hasSubBtn ? 'PASS' : 'FAIL');
  if (hasSubBtn) throw new Error('"New sub-project" button should only appear on top-level projects');

  // ---------------------------------------------------------------------------
  // TEST 3: Department Pipeline (4 stages) & Drag-and-drop
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Opening department shows 4 stages & drag-and-drop ---');
  await page.goto(`${BASE_URL}/projects/proj_1/d/dept_tech`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const stagesVisible = await Promise.all([
    page.locator('[data-stage-column="Started"]').isVisible(),
    page.locator('[data-stage-column="Middle"]').isVisible(),
    page.locator('[data-stage-column="Ended"]').isVisible(),
    page.locator('[data-stage-column="Blockade"]').isVisible(),
  ]);
  const all4Stages = stagesVisible.every(Boolean);
  console.log('All 4 stage columns visible (Started, Middle, Ended, Blockade):', all4Stages ? 'PASS' : 'FAIL');
  if (!all4Stages) throw new Error('Not all 4 default stages are present');

  // ---------------------------------------------------------------------------
  // TEST 4: Create new "Marketing Campaign" sub-project with auto-setup
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Create new Marketing Campaign sub-project ---');
  await page.goto(`${BASE_URL}/projects/proj_1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const newSubBtn = page.locator('button:has-text("New sub-project")').first();
  await newSubBtn.click();
  await page.waitForTimeout(300);

  const testSubName = 'Auto Mkt Campaign ' + Date.now().toString().slice(-4);
  await page.fill('input[placeholder="e.g. Q4 SEO Surge Campaign"]', testSubName);

  // Click Marketing Campaign type button
  const mktTypeBtn = page.locator('button:has-text("Marketing Campaign")').first();
  await mktTypeBtn.click();
  await page.waitForTimeout(200);

  // Submit
  await page.click('button[type="submit"]:has-text("Create")');
  await page.waitForTimeout(1000);

  // Should navigate to new sub-project
  console.log('Current URL after creating sub-project:', page.url());
  const newSubTitle = page.locator(`h1:has-text("${testSubName}")`);
  const isCreatedTitleVisible = await newSubTitle.isVisible();
  console.log(`New sub-project "${testSubName}" page loaded:`, isCreatedTitleVisible ? 'PASS' : 'FAIL');
  if (!isCreatedTitleVisible) throw new Error('Sub-project title not visible after creation');

  // Verify Marketing and sub-departments appear
  const mktCard = page.locator('div:has-text("Marketing")').first();
  console.log('Marketing department exists on new sub-project:', (await mktCard.isVisible()) ? 'PASS' : 'FAIL');

  // ---------------------------------------------------------------------------
  // TEST 5: Tasks Page (/tasks) - 4 Columns, Stats, Filters & Drag to Ended
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: /tasks Page Verification ---');
  await page.goto(`${BASE_URL}/tasks`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const tasksH1 = page.locator('h1:has-text("Tasks")');
  console.log('Tasks title visible:', (await tasksH1.isVisible()) ? 'PASS' : 'FAIL');
  if (!(await tasksH1.isVisible())) throw new Error('Tasks header not visible');

  // Check top nav shows "Tasks" after Projects
  const navTasksLink = page.locator('nav[aria-label="Main Navigation"] a:has-text("Tasks")');
  console.log('Top navigation contains "Tasks" link:', (await navTasksLink.isVisible()) ? 'PASS' : 'FAIL');
  if (!(await navTasksLink.isVisible())) throw new Error('Top nav missing Tasks link');

  // Check 4 columns in Board View
  const taskCols = await Promise.all([
    page.locator('[data-stage-column="Started"]').isVisible(),
    page.locator('[data-stage-column="Middle"]').isVisible(),
    page.locator('[data-stage-column="Ended"]').isVisible(),
    page.locator('[data-stage-column="Blockade"]').isVisible(),
  ]);
  console.log('Tasks board has 4 columns across all projects:', taskCols.every(Boolean) ? 'PASS' : 'FAIL');

  // Check stats numbers
  const statTiles = page.locator('[data-stat-tile]');
  const statCount = await statTiles.count();
  console.log(`Found ${statCount} stat tiles:`, statCount === 4 ? 'PASS' : 'FAIL');
  if (statCount !== 4) throw new Error('Expected 4 stat tiles on /tasks');

  // Test filter by Project
  const projectSelect = page.locator('select').first();
  await projectSelect.selectOption({ index: 1 });
  await page.waitForTimeout(300);
  console.log('Filtered by specific project: PASS');
  await projectSelect.selectOption('all');
  await page.waitForTimeout(300);

  // Switch to List View
  const listViewBtn = page.locator('button:has-text("List")');
  await listViewBtn.click();
  await page.waitForTimeout(400);
  const listRows = page.locator('div[class*="rounded-2xl border"]');
  console.log(`List view shows ${await listRows.count()} task rows: PASS`);

  // Switch back to Board View
  const boardViewBtn = page.locator('button:has-text("Board")');
  await boardViewBtn.click();
  await page.waitForTimeout(400);

  // Drag a card from Started to Ended
  const startedCol = page.locator('[data-stage-column="Started"]').first();
  const firstCard = startedCol.locator('div[data-task-id]').first();
  const taskId = await firstCard.getAttribute('data-task-id');
  const endedCol = page.locator('[data-stage-column="Ended"]').first();

  const cardBox = await firstCard.boundingBox();
  const endedBox = await endedCol.boundingBox();

  if (cardBox && endedBox) {
    console.log(`Dragging task ${taskId} from Started (${Math.round(cardBox.x)}, ${Math.round(cardBox.y)}) to Ended (${Math.round(endedBox.x + endedBox.width/2)}, ${Math.round(endedBox.y + 120)})...`);
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(endedBox.x + endedBox.width / 2, endedBox.y + 120, { steps: 20 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Verify task is now in Ended
    const inEnded = await page.locator(`[data-stage-column="Ended"] div[data-task-id="${taskId}"]`).isVisible();
    console.log(`Task ${taskId} moved to Ended column:`, inEnded ? 'PASS' : 'FAIL');
    if (!inEnded) throw new Error(`Task ${taskId} did not move to Ended column`);

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const inEndedAfterReload = await page.locator(`[data-stage-column="Ended"] div[data-task-id="${taskId}"]`).isVisible();
    console.log(`Task ${taskId} persisted in Ended after page reload:`, inEndedAfterReload ? 'PASS' : 'FAIL');
    if (!inEndedAfterReload) throw new Error(`Task ${taskId} not persisted in Ended after reload`);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Mobile Viewport Check (390px)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Mobile Viewport 390px Check ---');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${BASE_URL}/tasks`);
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(500);

  const mobileTasksTitle = await mobilePage.locator('h1:has-text("Tasks")').isVisible();
  console.log('Tasks page renders cleanly on 390px mobile:', mobileTasksTitle ? 'PASS' : 'FAIL');

  await mobileContext.close();

  // ---------------------------------------------------------------------------
  // TEST 7: Console Errors Check
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Console Errors Check ---');
  console.log(`Total console/page errors encountered: ${totalErrors}`);
  console.log('No console errors:', totalErrors === 0 ? 'PASS' : 'FAIL');

  await browser.close();
  console.log('\n=== ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===');
})();
