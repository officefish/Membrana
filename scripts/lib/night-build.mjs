import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { findTask, loadRegistry } from './task-registry.mjs';

export const NIGHT_ACTIVE_REL = 'docs/NIGHT_BUILD_ACTIVE.md';
export const NIGHT_LOG_REL = 'docs/NIGHT_BUILD_LOG.md';
export const NIGHT_ARCHIVE_DIR_REL = 'docs/archive/night-build';

/**
 * @param {string} [cwd]
 */
export function resolveNightActivePath(cwd = process.cwd()) {
  return resolve(cwd, NIGHT_ACTIVE_REL);
}

/**
 * @param {string} [cwd]
 */
export function resolveNightLogPath(cwd = process.cwd()) {
  return resolve(cwd, NIGHT_LOG_REL);
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} [cwd]
 */
export function resolveNightHandoffDir(dateKey, cwd = process.cwd()) {
  return resolve(cwd, NIGHT_ARCHIVE_DIR_REL, dateKey);
}

/**
 * @param {string} [cwd]
 * @returns {{ epicId: string; startedAt: string; branch: string } | null}
 */
export function readActiveNightBuild(cwd = process.cwd()) {
  const path = resolveNightActivePath(cwd);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const epicMatch = text.match(/\*\*Epic:\*\*\s*`([^`]+)`/);
  const startedMatch = text.match(/\*\*Старт:\*\*\s*([^\n]+)/);
  const branchMatch = text.match(/\*\*Ветка:\*\*\s*`([^`]+)`/);
  if (!epicMatch) return null;
  return {
    epicId: epicMatch[1],
    startedAt: startedMatch?.[1]?.trim() ?? '',
    branch: branchMatch?.[1] ?? '',
  };
}

/**
 * @param {string} epicId
 * @param {{ force?: boolean; continue?: boolean; cwd?: string }} [opts]
 */
export function openNightBuild(epicId, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const registry = loadRegistry(cwd);
  const epic = findTask(registry, epicId);
  if (!epic) {
    throw new Error(`Задача "${epicId}" не найдена в registry.json`);
  }
  if (epic.sprintKind && epic.sprintKind !== 'night-build') {
    throw new Error(`"${epicId}" не помечена sprintKind: night-build`);
  }

  const existing = readActiveNightBuild(cwd);
  if (existing && !opts.force && !opts.continue) {
    throw new Error(
      `Уже активен night build "${existing.epicId}". Используй --force или --continue.`,
    );
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const branch = `night/${epicId}-${dateKey}`;
  const startedAt = new Date().toISOString();

  const subtasks = registry.tasks.filter(
    (t) => t.status === 'active' && t.parentEpic === epicId,
  );

  const subtaskLines =
    subtasks.length > 0
      ? subtasks.map((t) => `- [ ] \`${t.id}\` — ${t.title}`).join('\n')
      : '- _(подзадачи NB* в registry — см. epic-промпт)_';

  const activeMd = `# Night Build — активный sprint

> Сгенерировано: \`${startedAt}\` (\`yarn night:open\`)
> Регламент: [\`NIGHT_SPRINT_REGULATION.md\`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** \`${epicId}\`
**Старт:** ${startedAt}
**Ветка:** \`${branch}\`
**Base:** \`techies68\`
**Промпт:** [\`${epic.promptPath}\`](./${epic.promptPath.replace(/^docs\//, '')})

## Предусловия

- [ ] \`yarn ritual:evening\` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка \`${branch}\` создана от \`techies68\`
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

${subtaskLines}

## Чекпоинты

Append: \`yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."\`

Лог: [\`NIGHT_BUILD_LOG.md\`](./NIGHT_BUILD_LOG.md)

## Закрытие

\`\`\`bash
yarn night:close --id ${epicId}
\`\`\`
`;

  const activePath = resolveNightActivePath(cwd);
  mkdirSync(dirname(activePath), { recursive: true });
  writeFileSync(activePath, activeMd, 'utf8');

  const logPath = resolveNightLogPath(cwd);
  if (!existsSync(logPath) || opts.force) {
    writeFileSync(
      logPath,
      `# Night Build log\n\n## Open — ${startedAt}\n- Epic: \`${epicId}\`\n- Branch: \`${branch}\`\n\n`,
      'utf8',
    );
  } else {
    writeFileSync(
      logPath,
      `\n## Re-open — ${startedAt}\n- Epic: \`${epicId}\`\n- Continue: ${opts.continue ? 'yes' : 'no'}\n\n`,
      { flag: 'a' },
      'utf8',
    );
  }

  return { activePath, logPath, branch, startedAt, epic };
}

/**
 * @param {{ phase: string; status: string; note?: string; cwd?: string }} opts
 */
export function appendNightCheckpoint(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const logPath = resolveNightLogPath(cwd);
  const active = readActiveNightBuild(cwd);
  if (!active) {
    throw new Error('Нет активного night build. Запусти yarn night:open --id <epic-id>');
  }

  const line = `\n## Checkpoint ${opts.phase} — ${new Date().toISOString()}\n- Status: **${opts.status}**\n- Note: ${opts.note ?? '—'}\n`;
  if (!existsSync(logPath)) {
    writeFileSync(logPath, `# Night Build log\n${line}`, 'utf8');
  } else {
    writeFileSync(logPath, line, { flag: 'a' });
  }
  return logPath;
}

/**
 * @param {string} epicId
 * @param {{ cwd?: string }} [opts]
 */
export function closeNightBuild(epicId, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const active = readActiveNightBuild(cwd);
  if (!active) {
    throw new Error('Нет активного night build.');
  }
  if (active.epicId !== epicId) {
    throw new Error(`Активен "${active.epicId}", закрытие запрошено для "${epicId}".`);
  }

  const registry = loadRegistry(cwd);
  const epic = findTask(registry, epicId);
  const dateKey = new Date().toISOString().slice(0, 10);
  const handoffDir = resolveNightHandoffDir(dateKey, cwd);
  mkdirSync(handoffDir, { recursive: true });

  const logText = existsSync(resolveNightLogPath(cwd))
    ? readFileSync(resolveNightLogPath(cwd), 'utf8')
    : '_(log empty)_';

  const handoffMd = `# Night Build handoff — ${dateKey}

> Epic: \`${epicId}\`
> Закрыто: \`${new Date().toISOString()}\` (\`yarn night:close\`)
> Промпт: \`${epic?.promptPath ?? '?'}\`

## Для утреннего standup

1. Прочитать лог ниже и решить: **merge** \`${active.branch}\` → \`techies68\` | **continue night** | **rollback**.
2. \`yarn ritual:day\` — учесть блокеры в \`MAIN_DAY_ISSUE\`.
3. После merge PR: \`yarn task:archive cabinet-mp4-nb*\` по фазам.

## Рекомендуемые команды

\`\`\`bash
git log --oneline -10
yarn turbo run lint typecheck test build --continue
\`\`\`

## Лог ночи

${logText}

---

## Шаблон итога (заполнить вручную или агентом)

| Фаза | Статус | PR / commit |
|------|--------|-------------|
| NB0 | pending / done / deferred | |
| NB1 | pending / done / deferred | |
| NB2 | pending / done / deferred | |
| NB3 | pending / done / deferred | |

**Блокеры:**

- …

**LGTM Vesnin:** pending
`;

  const handoffPath = join(handoffDir, 'HANDOFF.md');
  writeFileSync(handoffPath, handoffMd, 'utf8');

  const closedActive = `# Night Build — closed

> Закрыто: \`${new Date().toISOString()}\`
> Handoff: [\`${handoffPath.replace(/\\/g, '/').split('Membrana/').pop() ?? handoffPath}\`](./archive/night-build/${dateKey}/HANDOFF.md)

Epic \`${epicId}\` — sprint завершён. Для нового: \`yarn night:open --id ${epicId} --continue\`.
`;
  writeFileSync(resolveNightActivePath(cwd), closedActive, 'utf8');

  return { handoffPath, dateKey };
}
