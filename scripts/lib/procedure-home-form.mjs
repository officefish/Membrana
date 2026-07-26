/**
 * Форма дома процедуры — версия и миграции (Ф4 #1220).
 * Канон: docs/procedures/VERSIONS.md, docs/procedures/HOME.md.
 *
 * Версия живёт в самом *.form.json (formVersion), не только в ссылке из MANIFEST.
 */

/** Текущее поколение формы дома. */
export const HOME_FORM_VERSION = '1.0.0';

/** Окно совместимости поколений формы (текущее; предыдущее — по мере нужды). */
export const HOME_FORM_COMPAT = Object.freeze([HOME_FORM_VERSION]);

const SEMVER_RE = /^\d+\.\d+\.\d+$/u;

/**
 * Мигрировать legacy-форму `{ version: 1 }` → канон formVersion.
 * Идемпотентна для уже мигрированных объектов.
 *
 * @param {unknown} raw
 * @returns {{ok: true, form: Record<string, unknown>, migrated: boolean}|{ok: false, error: string}}
 */
export function migrateHomeForm(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'форма — не объект' };
  }
  const src = /** @type {Record<string, unknown>} */ (raw);

  if (typeof src.formVersion === 'string') {
    const { version: _drop, ...rest } = src;
    return { ok: true, form: /** @type {Record<string, unknown>} */ (rest), migrated: false };
  }

  // Legacy: целочисленный version (пилот мостика до Ф4)
  if (src.version === 1) {
    const { version: _v, ...rest } = src;
    return {
      ok: true,
      form: {
        ...rest,
        formVersion: HOME_FORM_VERSION,
        compat: [...HOME_FORM_COMPAT],
      },
      migrated: true,
    };
  }

  if ('version' in src) {
    return {
      ok: false,
      error: `неизвестный legacy version=${JSON.stringify(src.version)} — нужна явная миграция`,
    };
  }

  return { ok: false, error: 'нет formVersion (и нет legacy version: 1)' };
}

/**
 * Проблемы схемы формы дома (после миграции или as-is).
 * @param {unknown} raw распарсенный JSON формы
 * @returns {string[]}
 */
export function homeFormProblems(raw) {
  const migrated = migrateHomeForm(raw);
  if (!migrated.ok) return [`home.form: ${migrated.error}`];

  const form = migrated.form;
  const problems = [];

  if (migrated.migrated) {
    problems.push(
      'home.form: legacy version:1 — мигрируй к formVersion (см. docs/procedures/VERSIONS.md)',
    );
  }

  if (typeof form.formVersion !== 'string' || !SEMVER_RE.test(form.formVersion)) {
    problems.push('home.form.formVersion — semver X.Y.Z');
  } else if (!HOME_FORM_COMPAT.includes(form.formVersion)) {
    problems.push(
      `home.form.formVersion «${form.formVersion}» вне окна compat [${HOME_FORM_COMPAT.join(', ')}]`,
    );
  }

  if (!Array.isArray(form.compat) || form.compat.length === 0) {
    problems.push('home.form.compat — непустой массив');
  } else {
    for (const c of form.compat) {
      if (typeof c !== 'string' || !SEMVER_RE.test(c)) {
        problems.push('home.form.compat: элемент — semver X.Y.Z');
        break;
      }
    }
    if (
      typeof form.formVersion === 'string' &&
      Array.isArray(form.compat) &&
      !form.compat.includes(form.formVersion)
    ) {
      problems.push('home.form: formVersion обязан входить в compat[]');
    }
  }

  if (!Array.isArray(form.mustExist) || form.mustExist.length === 0) {
    problems.push('home.form.mustExist — непустой массив');
  } else {
    for (const rel of form.mustExist) {
      if (typeof rel !== 'string' || rel.trim() === '') {
        problems.push('home.form.mustExist: элемент — не непустая строка');
        break;
      }
    }
  }

  if (form.extensionsMayNotOverride !== true) {
    problems.push('home.form: extensionsMayNotOverride обязан быть true');
  }

  return problems;
}
