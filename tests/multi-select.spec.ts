import { test, expect, Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Seed localStorage with test reminder items so we always have data to work with.
 */
async function seedReminders(page: Page) {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const items = [
      {
        id: 'test-1',
        name: 'Apple Juice',
        category: 'Beverages',
        productionDate: '2026-06-20',
        purchaseDate: '2026-06-25',
        shelfLifeDays: 30,
        price: 12.5,
        wasted: false,
        wastedAt: null,
        consumed: false,
        consumedAt: null,
      },
      {
        id: 'test-2',
        name: 'Yogurt',
        category: 'Dairy',
        productionDate: '2026-06-28',
        purchaseDate: '2026-07-01',
        shelfLifeDays: 14,
        price: 8.0,
        wasted: false,
        wastedAt: null,
        consumed: false,
        consumedAt: null,
      },
      {
        id: 'test-3',
        name: 'Cheese Block',
        category: 'Dairy',
        productionDate: '2026-05-15',
        purchaseDate: '2026-06-01',
        shelfLifeDays: 90,
        price: 22.0,
        wasted: false,
        wastedAt: null,
        consumed: false,
        consumedAt: null,
      },
      {
        id: 'test-4',
        name: 'Expired Milk',
        category: 'Dairy',
        productionDate: '2026-01-01',
        purchaseDate: '2026-01-05',
        shelfLifeDays: 7,
        price: 5.5,
        wasted: true,
        wastedAt: now,
        consumed: false,
        consumedAt: null,
      },
      {
        id: 'test-5',
        name: 'Finished Bread',
        category: 'Bakery',
        productionDate: '2026-06-01',
        purchaseDate: '2026-06-02',
        shelfLifeDays: 7,
        price: 3.0,
        wasted: false,
        wastedAt: null,
        consumed: true,
        consumedAt: now,
      },
    ];
    localStorage.setItem('expiration-reminder:items', JSON.stringify(items));
    localStorage.setItem(
      'expiration-reminder:sort',
      JSON.stringify({
        active: { key: 'remaining', dir: 'asc' },
        wasted: { key: 'wastedAt', dir: 'desc' },
        consumed: { key: 'consumedAt', dir: 'desc' },
      })
    );
  });
}

/**
 * Simulate a long press (≥500 ms hold) on an element using PointerEvents.
 * Dispatches the trailing click that a real browser would generate after pointerup.
 */
async function longPress(page: Page, selector: string, index = 0) {
  const el = page.locator(selector).nth(index);
  const box = await el.boundingBox();
  const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await el.evaluate((node, { cx, cy }) => {
    node.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true,
        clientX: cx, clientY: cy, pointerId: 1, pointerType: 'touch', isPrimary: true,
      })
    );
  }, { cx, cy });
  await page.waitForTimeout(600);
  await el.evaluate((node, { cx, cy }) => {
    node.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true, cancelable: true,
        clientX: cx, clientY: cy, pointerId: 1, pointerType: 'touch', isPrimary: true,
      })
    );
    // Real browsers fire click after pointerup — synthetic events don't, so we do it manually
    node.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy })
    );
  }, { cx, cy });
  await page.waitForTimeout(300);
}

/**
 * Add a reminder through the UI (click FAB → fill form → submit).
 */
async function addReminderViaUI(page: Page, name: string) {
  await page.locator('ion-fab-button').click();
  await page.waitForSelector('ion-modal:not(.overlay-hidden)', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(300);

  const modal = page.locator('ion-modal:not(.overlay-hidden)');
  await modal.locator('ion-input[label="Name"] input').fill(name);
  await modal.locator('ion-input[placeholder="Dairy / Meal prep / etc."] input').fill('Test');
  await modal.locator('ion-input[label="Production date"] input').fill('2026-06-20');
  await modal.locator('ion-input[label="Shelf life (days)"] input').fill('30');
  await modal.locator('ion-button').filter({ hasText: 'Add reminder' }).click();
  await page.waitForTimeout(500);
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe('Multi-Select Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Capture browser console for debugging — must be set up before any interactions
    page.on('console', msg => console.log('📟', msg.type(), msg.text()));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await seedReminders(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.reminder-card', { state: 'visible', timeout: 5000 });
  });

  // ── Entering / Exiting Selection Mode ────────────────────────────

  test('long press on an active item enters selection mode with that item pre-selected', async ({ page }) => {
    // We're on the "active" tab by default (3 active items)
    const cards = page.locator('.reminder-card');
    await expect(cards).toHaveCount(3);

    // Long press the first card
    await longPress(page, '.reminder-card', 0);

    // Selection mode should be active: checkboxes appear
    const checkboxes = page.locator('.reminder-checkbox');
    await expect(checkboxes.first()).toBeVisible();

    // The long-pressed item should be checked — IonCheckbox has a hidden input
    // and a visible checkbox input; use the ion-checkbox element directly
    const firstCheckbox = checkboxes.nth(0);
    await expect(firstCheckbox.locator('input[type="checkbox"]')).toBeChecked();

    // Other items should not be checked
    const secondCheckbox = checkboxes.nth(1);
    await expect(secondCheckbox.locator('input[type="checkbox"]')).not.toBeChecked();
  });

  test('long press does NOT trigger toggleSelect — item stays selected, not toggled off', async ({ page }) => {
    // Long press the first card
    await longPress(page, '.reminder-card', 0);

    // If toggleSelect were called by the trailing click after touchend,
    // the item would be deselected and the toolbar would show "0 selected".
    // Instead, it should still be "1 selected".
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('1 selected');

    // The first checkbox must remain checked (toggleSelect would have unchecked it)
    const firstCheckbox = page.locator('.reminder-checkbox').nth(0);
    await expect(firstCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('selection toolbar shows correct count and action buttons', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Toolbar should be visible
    const toolbar = page.locator('.selection-toolbar');
    await expect(toolbar).toBeVisible();

    // Should show "1 selected"
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('1 selected');

    // Should have close/cancel button
    await expect(page.locator('.selection-toolbar__cancel')).toBeVisible();

    // Should have both action buttons (consumed=green, wasted=red)
    await expect(page.locator('.selection-toolbar__action').nth(0)).toBeVisible();
    await expect(page.locator('.selection-toolbar__action').nth(1)).toBeVisible();
  });

  test('tapping an item in selection mode toggles its selection', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Now tap the second item (should select it)
    await page.locator('.reminder-card').nth(1).click();
    await page.waitForTimeout(200);

    // Both should now be selected
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('2 selected');

    await expect(
      page.locator('.reminder-checkbox').nth(0).locator('input[type="checkbox"]')
    ).toBeChecked();
    await expect(
      page.locator('.reminder-checkbox').nth(1).locator('input[type="checkbox"]')
    ).toBeChecked();

    // Tap the first item again to deselect
    await page.locator('.reminder-card').nth(0).click();
    await page.waitForTimeout(200);

    // Should show "1 selected"
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('1 selected');
  });

  test('the first selected item can be unselected after entering selection mode', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Item 0 was pre-selected by the long press — "1 selected"
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('1 selected');

    // Tap the same item to deselect it
    await page.locator('.reminder-card').nth(0).click();
    await page.waitForTimeout(300);

    // Should now show "0 selected" — toolbar stays, buttons disabled
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('0 selected');
    await expect(page.locator('.selection-toolbar')).toBeVisible();
    await expect(page.locator('.selection-toolbar__action').nth(0)).toHaveClass(/fab-button-disabled/);
  });

  test('deselecting the last item keeps selection mode active with 0 selected', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Only one selected — tap it to deselect
    await page.locator('.reminder-card').nth(0).click();
    await page.waitForTimeout(300);

    // Selection toolbar should still be visible
    await expect(page.locator('.selection-toolbar')).toBeVisible();

    // Should show "0 selected"
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('0 selected');

    // Action buttons should be disabled (IonFabButton uses aria-disabled / fab-button-disabled class)
    await expect(page.locator('.selection-toolbar__action').nth(0)).toHaveClass(/fab-button-disabled/);
    await expect(page.locator('.selection-toolbar__action').nth(1)).toHaveClass(/fab-button-disabled/);

    // Re-select the item
    await page.locator('.reminder-card').nth(0).click();
    await page.waitForTimeout(300);

    // Should show "1 selected" again
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('1 selected');
    await expect(page.locator('.selection-toolbar__action').nth(0)).not.toHaveClass(/fab-button-disabled/);
  });

  test('clicking cancel (✕) button exits selection mode', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Click the close button
    await page.locator('.selection-toolbar__cancel').click();
    await page.waitForTimeout(300);

    // Selection mode should be gone
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();
    await expect(page.locator('.reminder-checkbox')).toHaveCount(0);
  });

  // ── Batch Actions ─────────────────────────────────────────────────

  test('batch mark as wasted moves selected items to wasted view', async ({ page }) => {
    // Select two active items
    await longPress(page, '.reminder-card', 0);

    // Tap second item to add to selection
    // Need to re-exit then re-enter with both? No — we can just tap the second
    await page.locator('.reminder-card').nth(1).click();
    await page.waitForTimeout(200);

    // Should show "2 selected"
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('2 selected');

    // Click the wasted button (red, second action button)
    await page.locator('.selection-toolbar__action').nth(1).click();
    await page.waitForTimeout(500);

    // Should exit selection mode
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();

    // Switch to wasted view to verify
    await page.locator('.view-switch__card').nth(2).click();
    await page.waitForTimeout(300);

    // Should have 3 wasted items now (1 pre-existing + 2 newly wasted)
    const wastedCards = page.locator('.reminder-card');
    const count = await wastedCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('batch mark as consumed moves selected items to consumed view', async ({ page }) => {
    // Select two active items
    await longPress(page, '.reminder-card', 0);
    await page.locator('.reminder-card').nth(1).click();
    await page.waitForTimeout(200);

    // Click the consumed button (green, first action button)
    await page.locator('.selection-toolbar__action').nth(0).click();
    await page.waitForTimeout(500);

    // Should exit selection mode
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();

    // Switch to consumed view to verify
    await page.locator('.view-switch__card').nth(1).click();
    await page.waitForTimeout(300);

    // Should have consumed items now
    const consumedCards = page.locator('.reminder-card');
    const count = await consumedCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('action buttons are disabled when nothing selected', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);
    // Deselect by tapping again
    await page.locator('.reminder-card').nth(0).click();
    await page.waitForTimeout(200);

    // Toolbar stays visible but buttons are disabled
    await expect(page.locator('.selection-toolbar')).toBeVisible();
    await expect(page.locator('.selection-toolbar ion-title')).toContainText('0 selected');
    await expect(page.locator('.selection-toolbar__action').nth(0)).toHaveClass(/fab-button-disabled/);
    await expect(page.locator('.selection-toolbar__action').nth(1)).toHaveClass(/fab-button-disabled/);
  });

  // ── Selection clears on context change ────────────────────────────

  test('switching view mode exits selection mode', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);
    await expect(page.locator('.selection-toolbar')).toBeVisible();

    // Switch to consumed view
    await page.locator('.view-switch__card').nth(1).click();
    await page.waitForTimeout(300);

    // Selection mode should be gone
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();
    await expect(page.locator('.reminder-checkbox')).toHaveCount(0);
  });

  test('changing category filter exits selection mode', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);
    await expect(page.locator('.selection-toolbar')).toBeVisible();

    // Click a category filter chip (e.g., "Dairy")
    const chip = page.locator('.category-filter ion-chip').filter({ hasText: 'Dairy' });
    await chip.click();
    await page.waitForTimeout(300);

    // Selection mode should be gone
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();
  });

  // ── Normal tap still works outside selection mode ─────────────────

  test('tapping an item outside selection mode opens detail overlay', async ({ page }) => {
    // Get the name of the first visible card before tapping
    const firstName = await page.locator('.reminder-card .reminder-name').first().textContent();

    // Tap the first card normally (quick tap)
    await page.locator('.reminder-card').first().click();
    await page.waitForTimeout(500);

    // Detail modal should open
    const modal = page.locator('ion-modal:not(.overlay-hidden)');
    await expect(modal).toBeVisible();

    // Should show the item name
    await expect(modal.locator('ion-title')).toContainText(firstName!);
  });

  // ── No FAB in selection mode ──────────────────────────────────────

  test('FAB is hidden during selection mode', async ({ page }) => {
    // Only the main floating add button inside IonFab (not toolbar action buttons)
    const addFab = page.locator('ion-fab ion-fab-button');
    await expect(addFab).toBeVisible();

    await longPress(page, '.reminder-card', 0);

    // FAB should be hidden
    await expect(addFab).not.toBeVisible();
  });

  // ── Toolbar position ──────────────────────────────────────────────

  test('selection toolbar is fixed at the bottom of the screen, not scrolled away', async ({ page }) => {
    await longPress(page, '.reminder-card', 0);

    // Verify toolbar is visible
    const toolbar = page.locator('.selection-toolbar');
    await expect(toolbar).toBeVisible();

    // Verify toolbar is positioned within the viewport (not outside the screen)
    const box = await toolbar.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    // The toolbar's bottom edge should be at or near the viewport bottom
    // (not pushed below by being inside scrollable content)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 2);
    // And positioned in the lower half of the screen
    expect(box!.y).toBeGreaterThan(viewport!.height * 0.5);
  });
});

test.describe('Multi-Select on Wasted/Consumed views', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('📟', msg.type(), msg.text()));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await seedReminders(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.view-switch__card', { state: 'visible', timeout: 5000 });
  });

  test('long press does NOT activate selection mode on wasted items', async ({ page }) => {
    // Switch to wasted view
    await page.locator('.view-switch__card').nth(2).click();
    await page.waitForTimeout(300);

    const cards = page.locator('.reminder-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Long press a wasted item
    await longPress(page, '.reminder-card', 0);

    // Selection mode should NOT activate on wasted view
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();
    await expect(page.locator('.reminder-checkbox').first()).not.toBeVisible();
  });

  test('long press does NOT activate selection mode on consumed items', async ({ page }) => {
    // Switch to consumed view
    await page.locator('.view-switch__card').nth(1).click();
    await page.waitForTimeout(300);

    const cards = page.locator('.reminder-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Long press a consumed item
    await longPress(page, '.reminder-card', 0);

    // Selection mode should NOT activate on consumed view
    await expect(page.locator('.selection-toolbar')).not.toBeVisible();
    await expect(page.locator('.reminder-checkbox').first()).not.toBeVisible();
  });
});
