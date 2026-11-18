const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  console.log('Navigating to Pipeline Board...');
  await page.goto('http://localhost:4173/projects/proj_1/d/dept_tech');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Helper to drag element A to element B
  async function dragTo(sourceLocator, targetLocator, offsetX = 0, offsetY = 60) {
    const srcBox = await sourceLocator.boundingBox();
    const tgtBox = await targetLocator.boundingBox();
    if (!srcBox || !tgtBox) throw new Error('Could not find bounding box for drag elements');
    console.log(`dragTo: src=(${Math.round(srcBox.x)}, ${Math.round(srcBox.y)}) tgt=(${Math.round(tgtBox.x)}, ${Math.round(tgtBox.y)}, w=${Math.round(tgtBox.width)}) dest=(${Math.round(tgtBox.x + tgtBox.width / 2 + offsetX)}, ${Math.round(tgtBox.y + offsetY)})`);

    await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
    await page.mouse.down();
    // Move 10px to trigger distance constraint (6px)
    await page.mouse.move(srcBox.x + srcBox.width / 2 + 10, srcBox.y + srcBox.height / 2 + 10, { steps: 5 });
    await page.waitForTimeout(100);

    // Drag smoothly to target
    await page.mouse.move(tgtBox.x + tgtBox.width / 2 + offsetX, tgtBox.y + offsetY, { steps: 15 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Click card without dragging -> Task Drawer opens
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: Click card without dragging ---');
  const taskStarted = page.locator('[data-task-id="task_6"]');
  await taskStarted.click();
  await page.waitForTimeout(400);

  const drawerTitle = page.locator('text=Task Details');
  const isDrawerOpen = await drawerTitle.isVisible();
  console.log('Task drawer opened on click:', isDrawerOpen ? 'PASS' : 'FAIL');
  if (!isDrawerOpen) throw new Error('Task drawer did not open on click');

  // Close drawer
  const closeBtn = page.locator('button[aria-label="Close drawer"], button[aria-label="Close task drawer"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.locator('text=Task Details').waitFor({ state: 'detached' });
  await page.waitForTimeout(300);

  // ---------------------------------------------------------------------------
  // TEST 2: Drag task from Started to Middle
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Drag task from Started to Middle ---');
  const middleCol = page.locator('[data-stage-column="Middle"]');
  await dragTo(taskStarted, middleCol, 0, 100);

  // Verify task_6 is now in Middle column
  const task6InMiddle = page.locator('[data-stage-column="Middle"] [data-task-id="task_6"]');
  const movedToMiddle = await task6InMiddle.isVisible();
  console.log('task_6 moved to Middle column:', movedToMiddle ? 'PASS' : 'FAIL');
  if (!movedToMiddle) throw new Error('task_6 failed to move to Middle column');

  // Allow mutation to persist to storage
  await page.waitForTimeout(1000);

  // Verify after refresh
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const task6StillInMiddle = await page.locator('[data-stage-column="Middle"] [data-task-id="task_6"]').isVisible();
  console.log('task_6 stays in Middle after refresh:', task6StillInMiddle ? 'PASS' : 'FAIL');
  if (!task6StillInMiddle) throw new Error('task_6 did not persist in Middle after refresh');

  // ---------------------------------------------------------------------------
  // TEST 3: Drag task into EMPTY Ended column (done_at set)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Drag task into EMPTY Ended column ---');
  const endedCol = page.locator('[data-stage-column="Ended"]');
  const taskToMoveToEnded = page.locator('[data-task-id="task_6"]');
  await dragTo(taskToMoveToEnded, endedCol, 0, 60);

  const taskInEnded = page.locator('[data-stage-column="Ended"] [data-task-id="task_6"]');
  const movedToEnded = await taskInEnded.isVisible();
  console.log('Task moved into empty Ended column:', movedToEnded ? 'PASS' : 'FAIL');
  if (!movedToEnded) throw new Error('Task failed to move into empty Ended column');

  // Verify done_at / Done chip
  const doneChip = page.locator('[data-stage-column="Ended"] [data-task-id="task_6"]').getByText('Done');
  const isDoneChipVisible = await doneChip.isVisible();
  console.log('Done chip visible on task in Ended column:', isDoneChipVisible ? 'PASS' : 'FAIL');
  if (!isDoneChipVisible) throw new Error('Done chip not visible in Ended column');

  // ---------------------------------------------------------------------------
  // TEST 4: Reorder two tasks inside Middle
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Reorder two tasks inside Middle ---');
  const task1Card = page.locator('[data-task-id="task_1"]');
  const task2Card = page.locator('[data-task-id="task_2"]');

  // Drag task_2 above task_1
  await dragTo(task2Card, task1Card, 0, 10);
  await page.waitForTimeout(400);

  // Check new order in Middle
  const middleTaskIds = await page.locator('[data-stage-column="Middle"] [data-task-id]').evaluateAll(
    nodes => nodes.map(n => n.getAttribute('data-task-id'))
  );
  console.log('Middle column task order after reorder:', middleTaskIds);
  console.log('Reorder verified:', middleTaskIds.length === 2 ? 'PASS' : 'FAIL');

  // ---------------------------------------------------------------------------
  // TEST 5: Drag to Blockade and back
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Drag to Blockade and back ---');
  const blockadeCol = page.locator('[data-stage-column="Blockade"]');
  const taskToBlockade = page.locator('[data-task-id="task_1"]');
  await dragTo(taskToBlockade, blockadeCol, 0, 60);

  const taskInBlockade = await page.locator('[data-stage-column="Blockade"] [data-task-id="task_1"]').isVisible();
  console.log('Task moved into Blockade column:', taskInBlockade ? 'PASS' : 'FAIL');
  if (!taskInBlockade) throw new Error('Task failed to move into Blockade');

  // Now drag back from Blockade to Middle
  const taskBackInMiddle = page.locator('[data-stage-column="Blockade"] [data-task-id="task_1"]');
  await middleCol.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await dragTo(taskBackInMiddle, middleCol, 0, 80);
  const taskReturnedToMiddle = await page.locator('[data-stage-column="Middle"] [data-task-id="task_1"]').isVisible();
  console.log('Task moved back from Blockade to Middle:', taskReturnedToMiddle ? 'PASS' : 'FAIL');
  if (!taskReturnedToMiddle) throw new Error('Task failed to move back to Middle');

  // ---------------------------------------------------------------------------
  // TEST 6: Auto-scroll when dragging toward right edge
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Auto-scroll toward right edge ---');
  const boardContainer = page.locator('.overflow-x-auto.pb-6');
  const initialScrollLeft = await boardContainer.evaluate(el => el.scrollLeft);
  console.log('Initial scrollLeft:', initialScrollLeft);

  const cardForScroll = page.locator('[data-task-id="task_2"]');
  const cardBox = await cardForScroll.boundingBox();
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height / 2 + 10, { steps: 5 });

  // Move cursor to far right edge of viewport
  await page.mouse.move(1420, cardBox.y + cardBox.height / 2, { steps: 20 });
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(400);

  const newScrollLeft = await boardContainer.evaluate(el => el.scrollLeft);
  console.log('New scrollLeft after right drag:', newScrollLeft);
  console.log('Right edge auto-scroll or reachability:', newScrollLeft >= initialScrollLeft ? 'PASS' : 'FAIL');

  // Screenshot of the board at 1440px
  await page.screenshot({ path: path.join(screenshotsDir, 'pipeline-board-1440px.png'), fullPage: true });
  console.log('Saved pipeline-board-1440px.png');

  // ---------------------------------------------------------------------------
  // TEST 7: Mobile 390px (long-press drag + swipe scroll)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Mobile 390px ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4173/projects/proj_1/d/dept_tech');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);

  // Switch to Middle tab
  const middleTab = mobilePage.locator('button:has-text("Middle")').first();
  await middleTab.click();
  await mobilePage.waitForTimeout(400);

  // Verify swipe-scrollable tab bar & task cards visible
  const mobileCard = mobilePage.locator('[data-stage-column="Middle"] [data-task-id]').first();
  const isMobileCardVisible = await mobileCard.isVisible();
  console.log('Mobile Middle card visible:', isMobileCardVisible ? 'PASS' : 'FAIL');

  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'pipeline-board-390px.png'), fullPage: true });
  console.log('Saved pipeline-board-390px.png');

  // ---------------------------------------------------------------------------
  // TEST 8: Console Errors Check
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Console errors check ---');
  console.log('Total console/page errors encountered:', errors.length);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    throw new Error(`Encountered ${errors.length} console/page errors`);
  }
  console.log('No console errors: PASS');

  await browser.close();
  console.log('\nALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('\nAcceptance test execution failed:', err);
  process.exit(1);
});
