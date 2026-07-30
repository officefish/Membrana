/**
 * cowork:close — закрытие Phase 5 коворка предикатом, а не памятью человека.
 *
 * ПОЧЕМУ ЭТО СУЩЕСТВУЕТ. Регламент объявлял `cowork:close` в § «Реестр и команды», а файла
 * не было — тот же класс, что пропавший `tasks-audit.mjs` и `meeting-audit.mjs`: канон
 * описывает тулинг, которого нет. Цена оказалась измеримой: флаг `COWORK_SPRINT_ACTIVE.md`
 * застрял ДВА коворка подряд.
 *   - `cowork-execution-registry` — интеграция отгружена 19.07 (PR #675), флаг стоял на
 *     Phase 4, ретайрен вручную 24.07; долг `#cowork-phase5-no-autoclose` закрыт `fact_ref`;
 *   - `cowork-strategic-docs-container` — доехал до Phase 5 24.07 (INTERFACE_CONTRACT +
 *     RETROSPECTIVE, 33/33 теста, интеграция в main), флаг шесть дней держал `open` и
 *     «Phase 1 — следующая», карточки в реестре не появилось вовсе. Ретайрен вручную 30.07,
 *     рецидив заведён как `#cowork-phase5-no-autoclose-r2`.
 * Оба раза лечение было ручным, потому что автоматического пути не существовало. Рецидив
 * 2/2 — не забывчивость, а отсутствие носителя.
 *
 * ЧЕСТНО О ГРАНИЦАХ. Инструмент судит ПРИЗНАКИ закрытия, а не качество работы: есть ли
 * контракт, несёт ли ретроспектива обязательную метрику резки, архивирована ли карточка,
 * сняты ли ветки блоков. «Хорошо ли сведены блоки» машине недоступно — это Phase 3 и глаз
 * координатора. Пустой список находок = «признаков незакрытости не найдено», НЕ «коворк
 * закрыт хорошо».
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Заголовок ACTIVE-файла со `status | open` (легаси-формат витрины, не JSON). */
export const ACTIVE_REL = 'docs/COWORK_SPRINT_ACTIVE.md';

/**
 * Обязательная строка ретроспективы (регламент § RETROSPECTIVE.md): метрика качества резки
 * brief. Без неё ретроспектива есть, а мерки нет — и следующий коворк режется на глазок.
 */
const RETRO_METRIC_RE = /адаптировать\s+vs\s+что\s+пришлось\s+переписать|адаптировано|переписано/iu;

/** sprintId из шапки ACTIVE: строка таблицы `| sprintId | \`cowork-…\` |`. */
export function activeSprintId(md) {
  return md.match(/\|\s*sprintId\s*\|\s*`([^`]+)`/u)?.[1] ?? null;
}

/** Признак «флаг открыт» — тот же, что читает `cowork-open.mjs` (один язык, один гард). */
export function activeIsOpen(md) {
  return md.includes('status** | `open`');
}

/** Слаги блоков из шапки ACTIVE: `| blocks | \`a\` · \`b\` · \`c\` |`. */
export function activeBlocks(md) {
  const row = md.match(/\|\s*blocks\s*\|([^|]+)\|/u)?.[1] ?? '';
  return [...row.matchAll(/`([a-z0-9][a-z0-9-]*)`/gu)].map((m) => m[1]);
}

/**
 * Находки незакрытости. Каждая — с ИМЕНЕМ (`id`), чтобы отказ был адресуемым, а не «что-то
 * не так». Порядок: сначала то, что делает разговор невозможным (нет флага, флаг не открыт),
 * потом артефакты, потом реестр, потом ветки.
 *
 * @param {{activeMd: string|null, sprintId: string|null, dirFiles: string[],
 *          retroMd: string|null, card: object|null, liveBranches: string[]}} state
 * @returns {{id: string, note: string, blocking: boolean}[]}
 */
export function closeFindings(state) {
  const out = [];
  if (state.activeMd == null) {
    out.push({ id: 'no_active', note: `${ACTIVE_REL} не найден — закрывать нечего`, blocking: true });
    return out;
  }
  if (!activeIsOpen(state.activeMd)) {
    out.push({
      id: 'active_not_open',
      note: 'флаг уже не `open` — повторное закрытие идемпотентно, но менять нечего',
      blocking: true,
    });
    return out;
  }
  if (!state.sprintId) {
    out.push({ id: 'no_sprint_id', note: 'в шапке ACTIVE нет строки `sprintId`', blocking: true });
    return out;
  }

  if (!state.dirFiles.includes('INTERFACE_CONTRACT.md')) {
    out.push({
      id: 'contract_missing',
      note: 'нет INTERFACE_CONTRACT.md — Phase 3 не состоялась, закрывать Phase 5 не по чему',
      blocking: true,
    });
  }
  if (!state.dirFiles.includes('RETROSPECTIVE.md')) {
    out.push({
      id: 'retrospective_missing',
      note: 'нет RETROSPECTIVE.md — Phase 5 без ретроспективы не Phase 5',
      blocking: true,
    });
  } else if (state.retroMd != null && !RETRO_METRIC_RE.test(state.retroMd)) {
    // Не blocking: ретроспектива написана, отсутствует обязательная СТРОКА. Это находка
    // качества, и глушить ею закрытие значило бы держать флаг открытым из-за формулировки.
    out.push({
      id: 'retrospective_missing_metric',
      note: 'в RETROSPECTIVE нет обязательной метрики резки «адаптировали vs переписали» — ' +
        'следующий коворк будет резаться на глазок',
      blocking: false,
    });
  }

  if (state.card == null) {
    out.push({
      id: 'card_missing',
      note: `карточки \`${state.sprintId}\` в реестре нет вовсе — коворк не был зарегистрирован`,
      blocking: false,
    });
  } else if (state.card.status !== 'archived') {
    out.push({
      id: 'card_not_archived',
      note: `карточка \`${state.sprintId}\` в статусе \`${state.card.status}\` — ` +
        'закрыть флаг можно, но `yarn task:archive` ещё не звали',
      blocking: false,
    });
  }

  if (state.liveBranches.length > 0) {
    // Тоже не blocking: снятие веток отгруженного коворка — отдельная операция, и ронять
    // закрытие флага из-за неё значит повторять ровно ту связку, из которой родился рецидив.
    out.push({
      id: 'branches_alive',
      note: `ветки блоков живы: ${state.liveBranches.join(', ')} — снятие отдельной операцией`,
      blocking: false,
    });
  }

  return out;
}

/** Можно ли закрыть: нет ни одной блокирующей находки. */
export function mayClose(findings) {
  return !findings.some((f) => f.blocking);
}

/**
 * Новый текст ACTIVE после закрытия. Флаг переводится в `closed`, а причина и вещдок
 * дописываются секцией — молчаливая перезапись шапки была бы тем же классом, что молчаливый
 * pass: снаружи не видно, на каком основании закрыли.
 *
 * @param {string} md текущий ACTIVE
 * @param {{sprintId: string, closedAt: string, findings: {id: string, note: string}[]}} p
 *   `closedAt` — параметр, не `Date.now()`: детерминизм теста дороже удобства.
 */
export function renderClosedActive(md, p) {
  const head = md.replace(
    /\|\s*\*\*status\*\*\s*\|\s*`open`[^|]*\|/u,
    `| **status** | \`closed\` — Phase 5 закрыта ${p.closedAt} (\`cowork:close\`) |`,
  );
  const notes = p.findings.length
    ? p.findings.map((f) => `- \`${f.id}\` — ${f.note}`).join('\n')
    : '- находок незакрытости нет';
  return (
    `${head.trimEnd()}\n\n---\n\n## Закрытие Phase 5 — \`cowork:close\` ${p.closedAt}\n\n` +
    `Спринт **\`${p.sprintId}\`** закрыт предикатом, а не памятью человека: контракт и ` +
    'ретроспектива на месте, блокирующих находок нет.\n\n' +
    `Неблокирующие находки, оставленные явно (закрытие флага из-за них не роняется):\n\n${notes}\n\n` +
    '**Что этот шаг НЕ утверждает:** качество сведения блоков машине недоступно. Пустой список ' +
    'находок означает «признаков незакрытости не найдено», а не «коворк закрыт хорошо».\n'
  );
}

/** Ветки блоков, ещё живые локально (по именам из ACTIVE). Чистая функция от списка ссылок. */
export function liveBlockBranches(sprintId, blocks, allBranches) {
  return blocks
    .map((b) => `cowork/${sprintId}/${b}`)
    .filter((name) => allBranches.includes(name));
}

/** Сбор состояния с диска — единственная IO-точка модуля. */
export function collectCloseState(repoRoot, { branches = [], registry = null } = {}) {
  const activePath = join(repoRoot, ACTIVE_REL);
  const activeMd = existsSync(activePath) ? readFileSync(activePath, 'utf8') : null;
  const sprintId = activeMd ? activeSprintId(activeMd) : null;
  const dir = sprintId ? join(repoRoot, 'docs', 'cowork-sprint', sprintId) : null;
  const dirFiles = dir && existsSync(dir) ? readdirSync(dir) : [];
  const retroPath = dir ? join(dir, 'RETROSPECTIVE.md') : null;
  const tasks = Array.isArray(registry?.tasks) ? registry.tasks : [];
  return {
    activeMd,
    sprintId,
    dirFiles,
    retroMd: retroPath && existsSync(retroPath) ? readFileSync(retroPath, 'utf8') : null,
    card: tasks.find((t) => t.id === sprintId) ?? null,
    liveBranches: sprintId && activeMd
      ? liveBlockBranches(sprintId, activeBlocks(activeMd), branches)
      : [],
  };
}
