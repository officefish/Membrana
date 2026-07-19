#!/usr/bin/env node
/**
 * always-yes: scoped auto-yes профиль разрешений Claude Code (ADR-0009 Р7).
 *
 * Включает АВТО-подтверждение на командной поверхности спринта (git/yarn/turbo,
 * правки файлов) при ЖЁСТКОМ deny-листе на опасное (прод-деплой, force-push, SSH,
 * правки @membrana/core, close-github). НЕ глобальный --dangerously-skip-permissions:
 * инварианты держит механический deny (deny > allow), а не добросовестность агента.
 *
 * Профиль пишется в ЛОКАЛЬНЫЙ `.claude/settings.local.json` (gitignored) — разрешения
 * это машинно-локальный концерн. Источник истины профиля — константа ниже (трекается).
 *
 * По умолчанию ВКЛЮЧЁН в ночном спринте (делегированный агент, ADR-0009); в дневном —
 * ЯВНО оператором. Скилл: .cursor/skills/membrana-always-yes/SKILL.md.
 *
 * Usage:
 *   node scripts/always-yes.mjs on      # включить профиль
 *   node scripts/always-yes.mjs off     # снять профиль (ровно свои записи)
 *   node scripts/always-yes.mjs status  # показать состояние
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SETTINGS_PATH = resolve(repoRoot, '.claude', 'settings.local.json');

/**
 * Scoped auto-yes профиль (ADR-0009 Р7). В Claude Code `deny` имеет приоритет над
 * `allow` во ВСЕХ режимах (даже bypass) — поэтому широкий allow рабочей поверхности
 * безопасен рядом с точечным deny. Паттерны Bash — space-форма с хвостовым `*`
 * (ведущие wildcard `Bash(*x*)` НЕ поддерживаются надёжно → префиксы перечисляем).
 *
 * Deny — механический backstop (defense-in-depth). Основной гард ночи — жёсткие
 * инварианты в промпте эпика (ADR-0009 Р2). Список прод-команд поддерживать в
 * синхроне с package.json (новый `*:deploy:prod` — дописать сюда).
 */
export const ALWAYS_YES_PROFILE = {
  allow: [
    'Bash(git *)',
    'Bash(yarn *)',
    'Bash(npx turbo *)',
    'Bash(node *)',
    'Edit',
    'Write',
  ],
  deny: [
    // Необратимое в git
    'Bash(git push --force*)',
    'Bash(git push -f *)',
    'Bash(git reset --hard*)',
    // Прод-деплой / откат (owner-гейт; ночью запрещён)
    'Bash(yarn cabinet:deploy:prod*)',
    'Bash(yarn cabinet:deploy:image:prod*)',
    'Bash(yarn cabinet:rollback:prod*)',
    'Bash(yarn device-board:deploy:prod*)',
    'Bash(yarn office:docker:prod:up*)',
    'Bash(yarn office:docker:prod:build*)',
    'Bash(yarn media:docker:prod:up*)',
    'Bash(yarn media:docker:prod:build*)',
    'Bash(node scripts/_ssh-office-prod-up*)',
    'Bash(ssh *)',
    // Закрытие Issue в GitHub (ночью запрещён)
    'Bash(yarn task:close-github*)',
    // Утренний land-каскад docs-report — owner-гейт; ночь только dry-run
    'Bash(yarn night:land-reports --execute*)',
    'Bash(yarn night:land-reports*--execute*)',
    'Bash(node scripts/night-land-reports.mjs --execute*)',
    'Bash(node scripts/night-land-reports.mjs*--execute*)',
    // Правки ядра — только консилиум/vesnin+LGTM (ADR-гейт)
    'Edit(packages/core/**)',
    'Write(packages/core/**)',
  ],
};

const MARKER = '_alwaysYesAdded';

/** Уникальное объединение, порядок сохраняется. */
function union(base, extra) {
  const out = [...base];
  for (const item of extra) if (!out.includes(item)) out.push(item);
  return out;
}

/**
 * Влить профиль в settings, запомнив добавленные записи под маркером — чтобы
 * `off` снял ровно их и не тронул ручные разрешения оператора. Идемпотентно.
 * @returns {object} новый settings-объект
 */
export function applyProfile(settings, profile = ALWAYS_YES_PROFILE) {
  const next = { ...settings, permissions: { ...(settings.permissions ?? {}) } };
  const perms = next.permissions;
  const already = new Set(perms[MARKER] ?? []);
  const added = [...(perms[MARKER] ?? [])];

  const merge = (key) => {
    const current = perms[key] ?? [];
    const toAdd = profile[key].filter((p) => !current.includes(p));
    perms[key] = union(current, profile[key]);
    for (const p of toAdd) if (!already.has(`${key}:${p}`)) added.push(`${key}:${p}`);
  };
  merge('allow');
  merge('deny');
  perms[MARKER] = added;
  return next;
}

/**
 * Снять ровно записи, добавленные `applyProfile` (по маркеру). Ручные разрешения
 * оператора и прочие ключи остаются. Идемпотентно.
 * @returns {object} новый settings-объект
 */
export function removeProfile(settings) {
  if (!settings.permissions?.[MARKER]) return settings;
  const next = { ...settings, permissions: { ...settings.permissions } };
  const perms = next.permissions;
  const added = perms[MARKER];
  for (const tag of added) {
    const sep = tag.indexOf(':');
    const key = tag.slice(0, sep);
    const pattern = tag.slice(sep + 1);
    if (Array.isArray(perms[key])) {
      perms[key] = perms[key].filter((p) => p !== pattern);
      if (perms[key].length === 0) delete perms[key];
    }
  }
  delete perms[MARKER];
  if (Object.keys(perms).length === 0) delete next.permissions;
  return next;
}

/** Активен ли профиль (есть маркер). */
export function isActive(settings) {
  return Boolean(settings.permissions?.[MARKER]?.length);
}

// ── CLI ────────────────────────────────────────────────────────────────────
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (e) {
    console.error(`[always-yes] не разобрать ${SETTINGS_PATH}: ${e.message}`);
    process.exit(1);
  }
}

function writeSettings(obj) {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

if (isMain()) {
  const cmd = process.argv[2];
  const settings = readSettings();
  if (cmd === 'on') {
    writeSettings(applyProfile(settings));
    console.log('[always-yes] профиль ВКЛЮЧЁН (scoped auto-yes; deny на прод/force/core/ssh).');
    console.log('  Перезапусти сессию Claude Code, чтобы разрешения подхватились.');
  } else if (cmd === 'off') {
    writeSettings(removeProfile(settings));
    console.log('[always-yes] профиль СНЯТ (свои записи удалены, ручные сохранены).');
  } else if (cmd === 'status') {
    console.log(`[always-yes] профиль ${isActive(settings) ? 'ВКЛЮЧЁН' : 'выключен'} (${SETTINGS_PATH}).`);
  } else {
    console.error('Usage: node scripts/always-yes.mjs on|off|status');
    process.exit(1);
  }
}
