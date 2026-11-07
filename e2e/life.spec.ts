import { expect, test, type Page } from '@playwright/test';

/**
 * Plays the human's side through the UI until the end of the game: accepts the first omen, pays
 * upkeep when possible, sometimes takes a market card or uses a card in hand, otherwise uses a
 * board action. Bots play themselves.
 */
async function playLife(page: Page, opponents: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/');
  await page.getByLabel('Имя героя').fill('Агнесса');
  await page.getByRole('radio', { name: opponents }).check();
  await page.getByRole('button', { name: 'Начать жизнь' }).click();

  const end = page.getByRole('heading', { name: 'Конец летописи' });
  const click = (selector: string, index = 0) =>
    page
      .locator(selector)
      .nth(index)
      .click({ timeout: 5000 })
      .catch(() => undefined);

  for (let step = 0; step < 2000; step++) {
    // One round trip to learn what the page asks for.
    const phase = await page.evaluate(() => {
      const has = (selector: string) => document.querySelector(selector) !== null;
      if (has('.end-page')) return { kind: 'end' };
      if (has('.upkeep-panel')) return { kind: 'upkeep' };
      if (has('.decision')) return { kind: 'omen' };
      const fast = document.querySelector<HTMLInputElement>('.turn-status input[type=checkbox]');
      if (fast && !fast.checked) return { kind: 'fast' };
      if (has('button.fast-forward')) return { kind: 'skip' };
      if (!has('.turn-you')) return { kind: 'wait' };
      return {
        kind: 'turn',
        market: document.querySelectorAll('.market button.card-title').length,
        hand: document.querySelectorAll('.hero .option-button:not([disabled])').length,
        spaces: document.querySelectorAll('.spaces .option-button:not([disabled])').length,
      };
    });
    if (phase.kind === 'end') break;
    if (phase.kind === 'omen') await click('.decision button.option-button:not([disabled])');
    else if (phase.kind === 'upkeep')
      await click('.upkeep-panel button.option-button:not([disabled])');
    else if (phase.kind === 'fast') await page.getByLabel('Быстрые соперники').check();
    else if (phase.kind === 'skip') await click('button.fast-forward');
    else if (phase.kind === 'wait') await page.waitForTimeout(100);
    else {
      const { market = 0, hand = 0, spaces = 0 } = phase;
      if (step % 3 === 0 && market > 0) {
        await click('.market button.card-title', step % market);
        if (
          await page.locator('.market .card-selected button.option-button:not([disabled])').count()
        ) {
          await click('.market .card-selected button.option-button:not([disabled])');
          continue;
        }
      }
      const advance = page.locator('.hero button.option-button:not([disabled])', {
        hasNotText: 'Отказаться',
      });
      if (step % 2 === 0 && hand > 0 && (await advance.count())) {
        await advance
          .first()
          .click({ timeout: 5000 })
          .catch(() => undefined);
      } else if (spaces > 0) {
        await click('.spaces button.option-button:not([disabled])', step % spaces);
      }
    }
  }

  await expect(end).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Жизнеописание' })).toBeVisible();
  await expect(page.locator('.biography p').first()).toContainText('Агнесса');
  expect(errors).toEqual([]);
}

test('a whole solo life, then it is in the archive', async ({ page }) => {
  await playLife(page, 'Одна жизнь (соло)');
  await expect(page.getByText(/Победа|Жизнь прожита/)).toBeVisible();
  await page.getByRole('button', { name: 'Новая жизнь' }).click();
  await page.getByRole('button', { name: 'Архив жизней (1)' }).click();
  await expect(page.locator('.life')).toHaveCount(1);
  await page.getByRole('button', { name: 'Открыть' }).click();
  await expect(page.locator('.biography p').first()).toContainText('Агнесса');
});

test('a life survives a page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Имя героя').fill('Гедеон');
  await page.getByRole('radio', { name: 'Соперников: 1' }).check();
  await page.getByRole('button', { name: 'Начать жизнь' }).click();
  await page.locator('.decision button.option-button:not([disabled])').first().click();
  await expect(page.locator('.turn-you')).toBeVisible();
  await page.locator('.spaces button.option-button:not([disabled])').first().click();
  await expect(page.getByRole('button', { name: 'Отменить ход' })).toBeEnabled();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Незаконченная летопись' })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Рынок' })).toBeVisible();
  await expect(page.locator('.hero-name')).toHaveText('Гедеон');
});

test('a whole life against three opponents', async ({ page }) => {
  await playLife(page, 'Соперников: 3');
  await expect(page.locator('.ledger tbody tr').first()).toBeVisible();
  await expect(page.locator('.ledger').first().locator('tbody tr')).toHaveCount(4);
});
