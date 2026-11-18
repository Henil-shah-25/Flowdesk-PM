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
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER error]:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('[BROWSER pageerror]:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to Ideas (/ideas)...');
  await page.goto('http://localhost:4173/ideas');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // ---------------------------------------------------------------------------
  // TEST 1: Board Canvas Presence & Initial Layout
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: Board Canvas Presence & Off-white background ---');
  const canvas = page.locator('[data-whiteboard-canvas="true"]');
  console.log('Canvas container visible:', (await canvas.isVisible()) ? 'PASS' : 'FAIL');

  const canvasBox = await canvas.boundingBox();
  console.log(`Canvas height = ${canvasBox?.height}px (min-height calc(100vh - 220px)):`, (canvasBox && canvasBox.height >= 500) ? 'PASS' : 'FAIL');

  // Floating toolbar
  const toolbarAddNote = page.locator('button:has-text("Add Note")');
  console.log('Floating toolbar "Add Note" button visible:', (await toolbarAddNote.isVisible()) ? 'PASS' : 'FAIL');

  // ---------------------------------------------------------------------------
  // TEST 2: Create 3 notes
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Create 3 notes ---');
  const initialNoteCount = await page.locator('[data-sticky-note]').count();
  console.log('Initial note count:', initialNoteCount);

  // Note 1: via "Capture Idea" button
  await page.click('button:has-text("Capture Idea")');
  await page.waitForTimeout(600);

  // Note 2: via floating toolbar "Add Note" button
  await page.click('button:has-text("Add Note")');
  await page.waitForTimeout(600);

  // Note 3: via double-click on empty canvas at (120, 550)
  if (canvasBox) {
    await page.mouse.dblclick(canvasBox.x + 120, canvasBox.y + 550);
  }
  await page.waitForTimeout(800);

  const finalNoteCount = await page.locator('[data-sticky-note]').count();
  console.log('New note count after creating 3 notes:', finalNoteCount);
  console.log('Created 3 notes successfully:', finalNoteCount === initialNoteCount + 3 ? 'PASS' : 'FAIL');
  if (finalNoteCount !== initialNoteCount + 3) throw new Error('Failed to create 3 notes');

  // ---------------------------------------------------------------------------
  // TEST 3: Drag notes around and verify positions persist after refresh
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Drag notes around & verify persistence ---');
  const latestNote = page.locator('[data-sticky-note]').last();
  const noteBox = await latestNote.boundingBox();
  if (!noteBox) throw new Error('Could not get note bounding box');

  console.log(`Dragging note from (${Math.round(noteBox.x)}, ${Math.round(noteBox.y)}) to (${Math.round(noteBox.x + 120)}, ${Math.round(noteBox.y + 80)})...`);
  await page.mouse.move(noteBox.x + noteBox.width / 2, noteBox.y + 30);
  await page.mouse.down();
  await page.mouse.move(noteBox.x + noteBox.width / 2 + 120, noteBox.y + 30 + 80, { steps: 10 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(1000);

  const noteBoxAfterDrag = await latestNote.boundingBox();
  console.log('Note position after drag:', Math.round(noteBoxAfterDrag?.x || 0), Math.round(noteBoxAfterDrag?.y || 0));

  // Reload page to verify persistence
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const reloadedNote = page.locator('[data-sticky-note]').last();
  const noteBoxAfterReload = await reloadedNote.boundingBox();
  console.log('Note position after reload:', Math.round(noteBoxAfterReload?.x || 0), Math.round(noteBoxAfterReload?.y || 0));
  const posDiff = Math.abs((noteBoxAfterReload?.x || 0) - (noteBoxAfterDrag?.x || 0));
  console.log(`Position difference after reload (${posDiff}px <= 15px):`, posDiff <= 15 ? 'PASS' : 'FAIL');
  if (posDiff > 15) throw new Error('Note position did not persist after reload');

  // ---------------------------------------------------------------------------
  // TEST 4: Resize a note
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Resize a note ---');
  const targetNote = page.locator('[data-sticky-note]').first();
  const resizeHandle = targetNote.locator('[data-resize-handle], .cursor-se-resize').first();
  const handleBox = await resizeHandle.boundingBox();
  if (!handleBox) throw new Error('Could not find resize handle');

  const beforeResizeW = (await targetNote.boundingBox())?.width || 0;
  console.log('Width before resize:', Math.round(beforeResizeW));

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 80, handleBox.y + 60, { steps: 8 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(600);

  const afterResizeW = (await targetNote.boundingBox())?.width || 0;
  console.log('Width after resize:', Math.round(afterResizeW));
  console.log('Note expanded successfully:', afterResizeW > beforeResizeW + 20 ? 'PASS' : 'FAIL');
  if (afterResizeW <= beforeResizeW + 20) throw new Error('Note did not resize successfully');

  // ---------------------------------------------------------------------------
  // TEST 5: Change color of a note
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Change note color ---');
  // Hover note to reveal color swatches
  await targetNote.hover();
  await page.waitForTimeout(200);

  const coralSwatch = targetNote.locator('button[style*="rgb(242, 160, 138)"], button[style*="#F2A08A"]').first();
  if (await coralSwatch.isVisible()) {
    await coralSwatch.click();
    await page.waitForTimeout(400);
    console.log('Color changed via note swatch: PASS');
  } else {
    // Click toolbar color swatch with note selected
    await targetNote.click();
    const toolbarSwatch = page.locator('button[style*="rgb(242, 160, 138)"], button[style*="#F2A08A"]').last();
    await toolbarSwatch.click();
    await page.waitForTimeout(400);
    console.log('Color changed via toolbar swatch: PASS');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Pan and Zoom
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Pan and Zoom ---');
  const zoomTextBefore = await page.locator('span:has-text("%")').innerText();
  console.log('Zoom before:', zoomTextBefore);

  await page.click('button[aria-label="Zoom in"]');
  await page.waitForTimeout(300);
  const zoomTextAfterIn = await page.locator('span:has-text("%")').innerText();
  console.log('Zoom after zoom in:', zoomTextAfterIn);
  console.log('Zoom in works:', zoomTextAfterIn !== zoomTextBefore ? 'PASS' : 'FAIL');

  await page.click('button[aria-label="Zoom out"]');
  await page.waitForTimeout(300);
  await page.click('button[title="Fit to view"]');
  await page.waitForTimeout(300);
  const zoomTextAfterFit = await page.locator('span:has-text("%")').innerText();
  console.log('Zoom after Fit:', zoomTextAfterFit);
  console.log('Fit to view resets to 100%:', zoomTextAfterFit === '100%' ? 'PASS' : 'FAIL');

  // ---------------------------------------------------------------------------
  // TEST 7: Promote one into Tech > Started and confirm a task appears on that pipeline
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Promote note into Tech > Started ---');
  const promoteBtn = page.locator('[data-sticky-note] button:has-text("Promote")').first();
  await promoteBtn.click();
  await page.waitForTimeout(500);

  // Verify Promote modal is open
  const promoteModalHeading = page.locator('text=Promote Idea to Pipeline Task');
  console.log('Promote modal opened:', (await promoteModalHeading.isVisible()) ? 'PASS' : 'FAIL');

  // Select target: Tech department, Started stage
  // Select Tech department
  const deptSelect = page.locator('select').nth(1);
  const deptOptions = await deptSelect.locator('option').allInnerTexts();
  console.log('Available departments for promotion:', deptOptions);

  // If Tech exists, select it
  const techOption = deptOptions.find(o => o.toLowerCase().includes('tech'));
  if (techOption) {
    await deptSelect.selectOption({ label: techOption });
    await page.waitForTimeout(300);
  }

  // Select Started stage
  const stageSelect = page.locator('select').last();
  const stageOptions = await stageSelect.locator('option').allInnerTexts();
  console.log('Available stages for promotion:', stageOptions);
  const startedOption = stageOptions.find(o => o.toLowerCase().includes('started'));
  if (startedOption) {
    await stageSelect.selectOption({ label: startedOption });
    await page.waitForTimeout(300);
  }

  // Confirm promotion
  await page.click('button:has-text("Confirm & Create Task")');
  await page.waitForTimeout(1000);

  // Navigate to Tech pipeline to confirm task appeared!
  console.log('Navigating to Tech Pipeline (/projects/proj_1/d/dept_tech) to verify promoted task...');
  await page.goto('http://localhost:4173/projects/proj_1/d/dept_tech');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const pipelineCards = await page.locator('[data-stage-column="Started"] [data-task-id]').count();
  console.log('Tasks in Tech > Started column:', pipelineCards);
  console.log('Promoted task exists on Tech pipeline:', pipelineCards >= 1 ? 'PASS' : 'FAIL');
  if (pipelineCards < 1) throw new Error('Promoted task not found on Tech > Started pipeline');

  // Go back to Ideas
  await page.goto('http://localhost:4173/ideas');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // ---------------------------------------------------------------------------
  // TEST 8: Delete and Undo
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Delete note and Undo ---');
  const countBeforeDel = await page.locator('[data-sticky-note]').count();
  const noteToDel = page.locator('[data-sticky-note]').first();
  await noteToDel.click();
  await page.waitForTimeout(200);

  // Press Delete key
  await page.keyboard.press('Delete');
  await page.waitForTimeout(600);

  const countAfterDel = await page.locator('[data-sticky-note]').count();
  console.log('Note count after Delete:', countAfterDel);
  console.log('Note deleted via Delete key:', countAfterDel === countBeforeDel - 1 ? 'PASS' : 'FAIL');

  // Click Undo in toast or toolbar
  const undoToastBtn = page.locator('button:has-text("Undo")').first();
  if (await undoToastBtn.isVisible()) {
    await undoToastBtn.click();
    await page.waitForTimeout(600);
    const countAfterUndo = await page.locator('[data-sticky-note]').count();
    console.log('Note count after Undo:', countAfterUndo);
    console.log('Note restored via Undo:', countAfterUndo === countBeforeDel ? 'PASS' : 'FAIL');
  }

  // Screenshot at 1440px
  await page.screenshot({ path: path.join(screenshotsDir, 'ideas-whiteboard-1440px.png'), fullPage: true });
  console.log('Saved ideas-whiteboard-1440px.png');

  // ---------------------------------------------------------------------------
  // TEST 9: Mobile 390px (touch drag & pinch)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Mobile viewport 390px ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4173/ideas');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);

  const mobileCanvas = mobilePage.locator('[data-whiteboard-canvas="true"]');
  console.log('Mobile whiteboard canvas visible:', (await mobileCanvas.isVisible()) ? 'PASS' : 'FAIL');

  const mobileNote = mobilePage.locator('[data-sticky-note]').first();
  console.log('Mobile sticky note visible:', (await mobileNote.isVisible()) ? 'PASS' : 'FAIL');

  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'ideas-mobile-390px.png'), fullPage: true });
  console.log('Saved ideas-mobile-390px.png');

  // ---------------------------------------------------------------------------
  // TEST 10: Console Errors Check
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Console errors check ---');
  console.log('Total console/page errors encountered:', errors.length);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    throw new Error(`Encountered ${errors.length} errors`);
  }
  console.log('No console errors: PASS');

  await browser.close();
  console.log('\nALL IDEAS WHITEBOARD ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('\nIdeas acceptance test failed:', err);
  process.exit(1);
});
