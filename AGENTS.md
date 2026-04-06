# AI Agent Guidelines

## UI Design Guidelines

Always reference STYLE_GUIDE.md before generating any UI or CSS.

## Testing After File Edits

After editing any source files, always run the relevant tests to verify the changes:

1. **Run related test files**: Identify and run test files that cover the modified functionality
2. **Run all tests if uncertain**: If unsure which tests are related, run all tests to ensure no regressions
3. **Fix failing tests**: If tests fail, fix the issues before considering the task complete

### Workflow

1. Edit source file(s)
2. Run relevant tests
3. If tests fail, analyze the logs and fix the issues
4. Re-run tests until all pass

## Test Development Guidelines

### UI Visibility Testing

- **When adding new UI, first write test cases to ensure visibility** - Before testing functionality, ensure the UI elements are properly visible and accessible
- Create tests that verify:
  - Elements are within viewport bounds
  - Elements are not overlapped by other elements
  - Elements are clickable on both desktop and mobile viewports
  - Example:
    ```typescript
    // First: Test visibility
    test('new feature panel is visible', async ({ page }) => {
      const panel = page.locator('.new-feature-panel');
      const box = await panel.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
    });
    
    // Then: Test functionality
    test('new feature works correctly', async ({ page }) => {
      // Test the actual functionality
    });
    ```

### Test Code Organization

- **Extract common code into helper functions** - Avoid duplication by creating reusable helper functions
- Place helper functions at the top of test files or in shared utility files
- Example:
  ```typescript
  // GOOD - reusable helper function
  async function openSideMenu(page: Page) {
    await page.click('.menu-trigger-btn');
    await page.waitForSelector('.side-menu--open', { state: 'visible' });
    await page.waitForTimeout(400); // Wait for CSS transition
  }
  
  test('test 1', async ({ page }) => {
    await openSideMenu(page);
    // ... test logic
  });
  
  test('test 2', async ({ page }) => {
    await openSideMenu(page);
    // ... test logic
  });
  
  // BAD - duplicated code
  test('test 1', async ({ page }) => {
    await page.click('.menu-trigger-btn');
    await page.waitForSelector('.side-menu--open', { state: 'visible' });
    await page.waitForTimeout(400);
    // ... test logic
  });
  ```

### Debugging Failed Tests

When tests fail, add appropriate logs to diagnose the issue:

1. **Add console.log in test files** to capture values and state:
   ```typescript
   const status = await page.locator('.status-badge').textContent();
   console.log('Current status:', status);
   ```

2. **Add logs in source code** to trace execution flow:
   ```typescript
   console.log('[SyncEngine] Starting sync with config:', config);
   console.log('[SyncEngine] Sync result:', result);
   ```

3. **Use page.evaluate() to inspect DOM state**:
   ```typescript
   const html = await page.evaluate(() => document.body.innerHTML);
   console.log('Page HTML:', html);
   ```

4. **Check browser console logs**:
   ```typescript
   const logs = [];
   page.on('console', msg => logs.push(msg.text()));
   // ... run test ...
   console.log('Browser logs:', logs);
   ```

5. **Take screenshots on failure**:
   ```typescript
   await page.screenshot({ path: 'test-failure.png' });
   ```

6. After debugging is complete, some necessary logs can be saved.

### Debugging Workflow for Failed Tests

When a test case fails, follow these steps:

1. **Capture browser console logs** to see JavaScript errors and warnings:
   ```typescript
   const browserLogs = [];
   page.on('console', msg => {
     browserLogs.push({ type: msg.type(), text: msg.text() });
   });
   // ... test code ...
   console.log('Browser console logs:', JSON.stringify(browserLogs, null, 2));
   ```

2. **Add temporary debug logs in source code** at key points:
   - Entry and exit of functions
   - Error catch blocks
   - State changes
   - API calls and responses

3. **Run the specific failing test** with visible browser for visual debugging:
   ```bash
   npx playwright test tests/file.spec.ts --project=chromium --headed --workers=1
   ```

4. **Use -g option to run specific test case** to save time when fixing a failed test:
   ```bash
   npx playwright test tests/file.spec.ts -g "test case name" --project=chromium
   ```

### Test Execution Guidelines

- **Use `--workers=1` only when fixing failed test cases** - This runs tests sequentially and makes debugging easier
- **For regular test runs, do not specify `--workers=1`** - Let Playwright use the default parallel execution for faster test runs
- Example:
  ```bash
  # When fixing failed tests - use workers=1
  npx playwright test tests/file.spec.ts --project=chromium --workers=1
  
  # For regular test runs - use default parallel execution
  npx playwright test tests/file.spec.ts --project=chromium
  ```

5. **Check network requests** if the test involves API calls:
   ```typescript
   const requests = [];
   page.on('request', req => requests.push({ method: req.method(), url: req.url() }));
   page.on('response', res => console.log(`Response: ${res.status()} ${res.url()}`));
   ```

6. **Fix the root cause** in source code, not just the test

7. **Clean up debug logs** after the test passes

### Mobile Testing Guidelines

- **Ensure elements are visible before clicking on mobile viewports** - Elements outside the viewport cannot be clicked by Playwright
- Use `scrollIntoViewIfNeeded()` to bring elements into view before clicking:
  ```typescript
  // GOOD - ensure visibility before clicking
  const menuItem = page.locator('.side-menu-item:has-text("🗑️ Trash Bin")');
  await menuItem.scrollIntoViewIfNeeded();
  await menuItem.click();
  
  // BAD - clicking element that may be outside viewport on mobile
  await page.click('.side-menu-item:has-text("🗑️ Trash Bin")');
  ```
- **DO NOT use JavaScript clicks to bypass visibility checks** - This defeats the purpose of testing real user interactions
- Instead, ensure the UI properly scrolls elements into view or adjust the viewport size for mobile tests

### Test Timeout Guidelines

- **DO NOT add timeouts** (e.g., `page.waitForTimeout()`) in test actions that don't require backend access
- Timeouts should only be used for:
  - Waiting for backend API responses
  - Waiting for async operations like sync, file uploads, etc.
  - Allowing UI animations to complete when necessary
- For UI interactions (clicks, form fills, navigation), rely on Playwright's built-in waiting mechanisms
- Example of when NOT to use timeout:
  ```typescript
  // BAD - unnecessary timeout for UI interaction
  await page.click('.btn-menu');
  await page.waitForTimeout(500);
  await page.waitForSelector('.dropdown-menu');
  
  // GOOD - let Playwright wait naturally
  await page.click('.btn-menu');
  await page.waitForSelector('.dropdown-menu');
  ```

## Logging During Development

Logs with appropriate detail should be added during development to facilitate debugging and monitoring:

1. **Log important operations**: Add logs for key operations like initialization, data loading, sync operations, and error handling
2. **Use appropriate log levels**:
   - `console.error` for errors and exceptions
   - `console.warn` for warnings and potential issues
   - `console.info` for important state changes and operations
   - `console.debug` for detailed debugging information (development only)
3. **Include context**: Log messages should include relevant context like IDs, timestamps, and operation names
4. **Avoid sensitive data**: Never log passwords, tokens, or personal user data
5. **Clean up**: Remove or disable debug logs before production deployment

### Example

```typescript
console.info('[SyncEngine] Initializing with backend:', backendName);
console.debug('[SyncEngine] Sync started at:', new Date().toISOString());
console.warn('[SyncEngine] Retry attempt:', retryCount);
console.error('[SyncEngine] Sync failed:', error.message);
```
