/**
 * Режимы чеканки промокода панели — чистое решение формы «Новый промокод».
 *
 * Три режима вместо прежнего булева «полный доступ»:
 * - `full` — доступ ко всем разделам панели, текущим и будущим («*»);
 * - `sections` — только отмеченные разделы панели;
 * - `cabinet` — приглашение в КАБИНЕТ, другой продукт: грант ровно
 *   `cabinet-register`, без «*» и без разделов панели.
 *
 * Почему режим кабинета не галочка в списке разделов: разделы дают доступ к
 * панели, а этот грант не про панель вовсе — дверь офиса сверяет его букву
 * (`packages/background-office/src/modules/panel-users/panel-users-core.ts`,
 * `CABINET_REGISTER_GRANT`), и «*» она отвергает как `grant_mismatch`.
 *
 * Панель — браузерное приложение и в `packages/*` не заглядывает (канон
 * office-panel-contour, OP1), поэтому буква объявлена здесь ВТОРОЙ раз. Расхождение
 * двух объявлений ловит зуб дрейфа в `mintModes.test.ts`: он читает исходник офиса.
 */

/** Буква гранта регистрации в кабинете. Зеркало офиса — держится зубом дрейфа. */
export const CABINET_REGISTER_GRANT = 'cabinet-register';

/** Грант «все разделы панели, текущие и будущие». */
export const WILDCARD_GRANT = '*';

export type MintMode = 'full' | 'sections' | 'cabinet';

export const MINT_MODES: readonly MintMode[] = ['full', 'sections', 'cabinet'];

export const MINT_MODE_LABELS: Record<MintMode, string> = {
  full: 'полный доступ («*», все разделы)',
  sections: 'только выбранные разделы',
  // Словарь продукта: в кабинете поле называется «Код приглашения», на лендинге —
  // «Кабинет — вход по приглашению». Панель говорит тем же словом.
  cabinet: 'приглашение в кабинет',
};

/**
 * Гранты кода по режиму. Для `sections` — ровно отмеченное (дедуп, без пустых),
 * для остальных выбор разделов не участвует.
 */
export function grantsForMode(mode: MintMode, picked: readonly string[] = []): string[] {
  if (mode === 'full') return [WILDCARD_GRANT];
  if (mode === 'cabinet') return [CABINET_REGISTER_GRANT];
  const out: string[] = [];
  for (const id of picked) {
    const v = typeof id === 'string' ? id.trim() : '';
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export interface MintDefaults {
  readonly days: number;
  readonly maxUses: number;
}

/**
 * Умолчания срока и числа использований. Приглашение в кабинет — короткое и
 * одноразовое (7 дней / 1), как у времянки `yarn panel:cabinet-invite`; коды
 * панели остаются прежними (30 дней / 1).
 */
export function defaultsForMode(mode: MintMode): MintDefaults {
  return mode === 'cabinet' ? { days: 7, maxUses: 1 } : { days: 30, maxUses: 1 };
}

/** Кнопка чеканки: имя обязательно, а в режиме разделов — хотя бы один раздел. */
export function canMint(mode: MintMode, label: string, picked: readonly string[] = []): boolean {
  if (!label.trim()) return false;
  return grantsForMode(mode, picked).length > 0;
}
