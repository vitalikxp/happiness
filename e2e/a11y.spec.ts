import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Automated accessibility checks (WCAG 2.2 AA rules of axe-core) on every screen, light and dark.

async function violations(page: Page, label: string) {
  // Let entrance animations finish: half-transparent ink would fail contrast checks.
  await page.waitForTimeout(1200);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return result.violations.map((v) => ({
    screen: label,
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
}

for (const scheme of ['light', 'dark'] as const) {
  test(`screens pass axe (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const found = [];
    await page.goto('/');
    found.push(...(await violations(page, 'title')));

    await page.getByRole('radio', { name: 'Соперников: 1' }).check();
    await page.getByRole('button', { name: 'Начать жизнь' }).click();
    found.push(...(await violations(page, 'omen')));

    await page.locator('.decision button.option-button:not([disabled])').first().click();
    await expect(page.locator('.turn-you')).toBeVisible();
    await page.locator('.market button.card-title').first().click();
    found.push(...(await violations(page, 'board')));

    await page.getByRole('button', { name: 'На титул' }).click();
    await page.getByRole('button', { name: /Архив жизней/ }).click();
    found.push(...(await violations(page, 'archive')));

    expect(found).toEqual([]);
  });
}
