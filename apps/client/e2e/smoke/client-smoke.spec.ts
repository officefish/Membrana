import { expect, type Page, test } from '@playwright/test';

/** Node connection picker on first load — choose autonomous for client-only smoke. */
async function dismissNodeModeModalIfOpen(page: Page): Promise<void> {
  const modalTitle = page.getByRole('heading', { name: 'Режим узла' });
  const hasModal = await modalTitle.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!hasModal) return;

  await page.getByRole('button', { name: 'Автономный узел', exact: true }).click();
  await expect(modalTitle).toBeHidden({ timeout: 5_000 });
}

async function openDeviceBoardShell(page: Page): Promise<void> {
  await page.goto('/');
  await dismissNodeModeModalIfOpen(page);
  await page.getByText('Доска устройства', { exact: true }).click();
  await page.getByTestId('device-board-launcher-create-workspace').click();
  await page.getByTestId('device-board-open-board').click();
  await expect(page.getByTestId('device-board-shell')).toBeVisible();
}

test('@smoke: app loads with Membrana title', async ({ page }) => {
  await page.goto('/');
  await dismissNodeModeModalIfOpen(page);
  await expect(page).toHaveTitle(/Membrana/i);
  await expect(page.locator('#root')).toBeVisible();
});

test('@smoke: device-board shell opens from module', async ({ page }) => {
  await openDeviceBoardShell(page);
});

test('@smoke: playback transport cluster is visible', async ({ page }) => {
  await openDeviceBoardShell(page);
  await expect(page.getByTestId('device-board-play')).toBeVisible();
  await expect(page.getByTestId('device-board-pause')).toBeVisible();
  await expect(page.getByTestId('device-board-stop')).toBeVisible();
});

test('@smoke: play click updates transport when scenario can run', async ({ page }) => {
  await openDeviceBoardShell(page);

  const play = page.getByTestId('device-board-play');
  const pause = page.getByTestId('device-board-pause');

  await expect(play).toBeVisible();
  if (await play.isDisabled()) {
    test.info().annotations.push({
      type: 'note',
      description: 'Play disabled (canRun=false) — transport presence verified only',
    });
    return;
  }

  await play.click();
  await expect(pause).toBeEnabled({ timeout: 10_000 });
});

test('@smoke: no uncaught page errors on dashboard load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await dismissNodeModeModalIfOpen(page);
  await expect(page.locator('#root')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
