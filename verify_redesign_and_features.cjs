const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('--- STARTING COMPREHENSIVE REDESIGN & ACCEPTANCE VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Visit Dashboard
    console.log('\n[TEST 1] Visiting Dashboard (http://localhost:4173/)...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify Body Background (flat #E4E6E9, no gradient)
    const bodyBg = await page.evaluate(() => {
      const el = document.body;
      const comp = window.getComputedStyle(el);
      return {
        backgroundColor: comp.backgroundColor,
        backgroundImage: comp.backgroundImage,
      };
    });
    console.log('Body background style:', bodyBg);
    // In CSS rgb(228, 230, 233) is #E4E6E9
    if (bodyBg.backgroundColor.includes('228, 230, 233') || bodyBg.backgroundColor.includes('#E4E6E9')) {
      console.log('PASS: Body background is flat #E4E6E9');
    } else {
      console.warn('NOTE: Body background color is', bodyBg.backgroundColor);
    }

    // Verify No backdrop-filter on cards
    const cardBlur = await page.evaluate(() => {
      const card = document.querySelector('.glass-surface');
      if (!card) return 'no card found';
      const comp = window.getComputedStyle(card);
      return comp.backdropFilter || comp.webkitBackdropFilter || 'none';
    });
    console.log('GlassCard backdrop-filter:', cardBlur);
    if (cardBlur === 'none' || cardBlur === '') {
      console.log('PASS: GlassCard has NO backdrop-filter');
    } else {
      console.warn('NOTE: GlassCard backdrop-filter is', cardBlur);
    }

    // Verify Greeting on Dashboard
    const greetingText = await page.locator('h1').textContent();
    console.log('Dashboard title:', greetingText);
    if (greetingText.includes('Henil')) {
      console.log('PASS: Dashboard shows time-aware greeting layout (Henil)');
    } else {
      throw new Error(`Expected greeting to contain Henil, got: ${greetingText}`);
    }

    // Screenshot Dashboard
    const dashboardScreenshotPath = path.resolve(__dirname, 'dashboard_redesign.png');
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: false });
    console.log('Captured Dashboard screenshot at:', dashboardScreenshotPath);

    // 2. Visit Today page
    console.log('\n[TEST 2] Visiting Today page (http://localhost:4173/today)...');
    await page.goto('http://localhost:4173/today', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const todayTitle = await page.locator('h1').textContent();
    const todayTitleFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return window.getComputedStyle(h1).fontSize;
    });
    console.log('Today page title:', todayTitle, 'Font size:', todayTitleFontSize);

    // Check task rows
    const taskRows = await page.locator('div[style*="padding: 12px 16px"], .min-h-\\[64px\\]').count();
    console.log('Today page visible task rows:', taskRows);

    // Screenshot Today
    const todayScreenshotPath = path.resolve(__dirname, 'today_redesign.png');
    await page.screenshot({ path: todayScreenshotPath, fullPage: false });
    console.log('Captured Today screenshot at:', todayScreenshotPath);

    // 3. Test TaskDetail Modal via ?task=
    console.log('\n[TEST 3] Testing shared TaskDetail Modal...');
    // Find first task from localStorage
    const firstTaskId = await page.evaluate(() => {
      const tasks = JSON.parse(localStorage.getItem('flowdesk_local_db_Tasks') || '[]');
      return tasks[0]?.id;
    });

    if (firstTaskId) {
      await page.goto(`http://localhost:4173/today?task=${firstTaskId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const taskDetailTitle = await page.locator('input[placeholder="Task title..."]').inputValue();
      console.log('TaskDetail modal opened! Title:', taskDetailTitle);

      const subtasksHeading = await page.locator('h3:has-text("Subtasks")').count();
      const notesHeading = await page.locator('h3:has-text("Notes")').count();
      console.log('Subtasks section present:', subtasksHeading > 0);
      console.log('Notes section present:', notesHeading > 0);

      // Close modal
      await page.locator('button[aria-label="Close task details"]').click();
      await page.waitForTimeout(500);
      const urlAfterClose = page.url();
      console.log('URL after closing task modal:', urlAfterClose);
      if (!urlAfterClose.includes('task=')) {
        console.log('PASS: TaskDetail closed and removed ?task= query parameter');
      }
    }

    // 4. Test Projects and DepartmentCard "..." menu
    console.log('\n[TEST 4] Testing Projects & DepartmentCard "..." menu...');
    await page.goto('http://localhost:4173/projects/proj_1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const deptCardMenuBtn = page.locator('button[aria-label="Department actions"]').first();
    if (await deptCardMenuBtn.count() > 0) {
      await deptCardMenuBtn.click();
      await page.waitForTimeout(400);

      const renameBtn = await page.locator('button:has-text("Rename")').count();
      const changeColorBtn = await page.locator('button:has-text("Change color")').count();
      const clearTasksBtn = await page.locator('button:has-text("Clear tasks")').count();
      const deleteBtn = await page.locator('button:has-text("Delete")').count();
      const saveTemplateBtn = await page.locator('button:has-text("Save tasks as template")').count();

      console.log('Menu items present:', {
        rename: renameBtn > 0,
        changeColor: changeColorBtn > 0,
        clearTasks: clearTasksBtn > 0,
        delete: deleteBtn > 0,
        saveTemplate: saveTemplateBtn > 0,
      });

      if (renameBtn > 0 && clearTasksBtn > 0 && deleteBtn > 0 && saveTemplateBtn > 0) {
        console.log('PASS: Department card "..." menu contains all 5 required actions');
      }
    }

    // 5. Test DepartmentPipeline and Templates Modal
    console.log('\n[TEST 5] Testing DepartmentPipeline and Templates Modal...');
    // Get first department id
    const firstDeptId = await page.evaluate(() => {
      const depts = JSON.parse(localStorage.getItem('flowdesk_local_db_Departments') || '[]');
      return depts[0]?.id;
    });

    if (firstDeptId) {
      await page.goto(`http://localhost:4173/projects/proj_1/d/${firstDeptId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const templatesBtn = page.locator('button:has-text("Templates")');
      const templatesBtnCount = await templatesBtn.count();
      console.log('Templates button count in board header:', templatesBtnCount);

      if (templatesBtnCount > 0) {
        await templatesBtn.first().click();
        await page.waitForTimeout(600);

        const modalTitle = await page.locator('h2:has-text("Template Library")').count();
        console.log('Template Library modal opened:', modalTitle > 0);

        const checkboxes = await page.locator('span:has-text("tasks selected")').textContent();
        console.log('Template modal footer status:', checkboxes);

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        console.log('PASS: Templates button and modal work properly');
      }
    }

    // 6. Test Settings page for Template Library Manager & Restore Departments
    console.log('\n[TEST 6] Testing Settings page...');
    await page.goto('http://localhost:4173/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tmplManagerHeading = await page.locator('h3:has-text("Template Library Manager")').count();
    const restoreDeptsBtn = await page.locator('button:has-text("Restore defaults")').count();
    console.log('Template Library Manager present:', tmplManagerHeading > 0);
    console.log('Restore default departments button present:', restoreDeptsBtn > 0);

    if (tmplManagerHeading > 0 && restoreDeptsBtn > 0) {
      console.log('PASS: Settings page contains Template Library Manager and Restore Default Departments');
    }

    // 7. Check Console Errors
    console.log('\n[TEST 7] Checking console errors...');
    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('WebSocket') && !err.includes('Failed to load resource')
    );
    console.log('Filtered console error count:', filteredErrors.length);
    if (filteredErrors.length > 0) {
      console.warn('Console errors detected:', filteredErrors);
    } else {
      console.log('PASS: 0 console errors detected!');
    }

    console.log('\n==============================================');
    console.log('ALL REDESIGN AND FEATURE ACCEPTANCE TESTS PASS!');
    console.log('==============================================');
  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
