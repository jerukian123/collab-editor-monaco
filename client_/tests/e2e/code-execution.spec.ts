import { test, expect, type Page } from '@playwright/test';

async function startSession(page: Page) {
  await page.goto('/');
  await page.click('text=Start Session');
  await page.waitForSelector('.monaco-editor', { timeout: 10000 });
  // Give Socket.IO time to connect, receive editors_list, and join room
  await page.waitForTimeout(500);
}

async function typeInEditor(page: Page, code: string) {
  await page.locator('.view-lines').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(code);
  // Wait for Monaco 500ms debounce + Vue reactivity
  await page.waitForTimeout(700);
}

test.describe('Code Execution', () => {
  test('should execute JavaScript code and show output', async ({ page }) => {
    await startSession(page);
    await typeInEditor(page, 'console.log("Hello from test")');

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button:has-text("Run")');

    await page.waitForSelector('text=Exit: 0', { timeout: 15000 });
    const output = await page.locator('pre').first().textContent();
    expect(output).toContain('Hello from test');
  });

  test('should show exit code and execution time', async ({ page }) => {
    await startSession(page);
    await typeInEditor(page, 'console.log("Exit code test")');

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button:has-text("Run")');

    await page.waitForSelector('text=Exit:', { timeout: 15000 });
    const resultMeta = await page.locator('text=javascript').first().isVisible();
    expect(resultMeta).toBe(true);
    const metaText = await page.locator('.space-y-4').textContent();
    expect(metaText).toMatch(/\d+ms/);
  });

  test('should execute code with keyboard shortcut Ctrl+Enter', async ({ page }) => {
    await startSession(page);
    await typeInEditor(page, 'console.log("Shortcut test")');

    // Open then close output pane - leaves focus on Output button (not Monaco)
    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button[title="Close output pane"]');
    await page.waitForTimeout(200);

    // Ctrl+Enter now fires from Output button focus, reaches window listener
    await page.keyboard.press('Control+Enter');

    await page.waitForSelector('button:has-text("Run")', { timeout: 8000 });
    await page.waitForSelector('text=Exit:', { timeout: 15000 });

    const outputText = await page.locator('pre').first().textContent();
    expect(outputText).toContain('Shortcut test');
  });

  test('should show error output for invalid code', async ({ page }) => {
    await startSession(page);

    await page.click('button:has-text("New File")');
    await page.waitForSelector('input[placeholder]');
    await page.fill('input[placeholder]', 'error_test.py');

    // Select Python from the Radix UI Select dropdown
    await page.click('[id="language"]');
    await page.waitForTimeout(200);
    await page.getByRole('option', { name: 'Python' }).click();

    await page.click('button:has-text("Create File")');
    // Click on the newly created file to make it active
    await page.click('button:has-text("error_test.py")');
    await page.waitForSelector('.monaco-editor');
    await page.waitForTimeout(500);

    await typeInEditor(page, 'print(undefined_variable)');

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button:has-text("Run")');

    await page.waitForSelector('text=Exit:', { timeout: 15000 });
    const hasStderr = await page.locator('text=Error Output:').isVisible();
    expect(hasStderr).toBe(true);
  });

  test('should disable run button for unsupported language', async ({ page }) => {
    await startSession(page);

    await page.click('button:has-text("New File")');
    await page.waitForSelector('input[placeholder]');
    await page.fill('input[placeholder]', 'index.html');

    // Select HTML from the Radix UI Select dropdown
    await page.click('[id="language"]');
    await page.waitForTimeout(200);
    await page.getByRole('option', { name: 'HTML' }).click();

    await page.click('button:has-text("Create File")');
    // Click on the newly created HTML file to make it active
    await page.click('button:has-text("index.html")');
    await page.waitForSelector('.monaco-editor');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');

    // HTML is not in Piston LANGUAGE_MAP - Run should be disabled
    const runButton = page.locator('button:has-text("Run")');
    await expect(runButton).toBeDisabled();

    const unsupportedMsg = await page.locator('text=Execution not supported').isVisible();
    expect(unsupportedMsg).toBe(true);
  });

  test('should clear output when clicking clear button', async ({ page }) => {
    await startSession(page);
    await typeInEditor(page, 'console.log("Clear test")');

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button:has-text("Run")');
    await page.waitForSelector('text=Exit:', { timeout: 15000 });

    await page.waitForSelector('button[title="Clear output"]');
    await page.click('button[title="Clear output"]');

    expect(await page.locator('text=Exit:').isVisible()).toBe(false);
    expect(await page.locator('text=No output yet').isVisible()).toBe(true);
  });

  test('should close output pane when clicking close button', async ({ page }) => {
    await startSession(page);

    await page.click('button:has-text("Output")');
    await page.waitForSelector('button:has-text("Run")');
    await page.click('button[title="Close output pane"]');

    expect(await page.locator('button:has-text("Run")').isVisible()).toBe(false);
  });

  test('should show user attribution in collaborative execution', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await startSession(page1);
      await startSession(page2);

      // Open output pane on page2 BEFORE execution so outputPaneRef is mounted
      await page2.click('button:has-text("Output")');
      await page2.waitForSelector('button:has-text("Run")');

      // Page 1 types and runs code
      await typeInEditor(page1, 'console.log("Collab test")');
      await page1.click('button:has-text("Output")');
      await page1.waitForSelector('button:has-text("Run")');
      await page1.click('button:has-text("Run")');

      // Both should see the result
      await page1.waitForSelector('text=Exit: 0', { timeout: 15000 });
      await page2.waitForSelector('text=Exit: 0', { timeout: 10000 });

      // Page 2's result shows user attribution badge (background-color in inline style)
      const attributionBadge = page2.locator('[style*="background-color"]').first();
      await expect(attributionBadge).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
