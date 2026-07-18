/**
 * tasks:audit — аудит реестра задач: что из `active` закрыто НА САМОМ ДЕЛЕ.
 *
 * `package.json` ссылался на `scripts/tasks-audit.mjs`, файла не существовало —
 * дефект `Db` заседания `meeting-evening-auditor`. Спека процесса:
 * `docs/prompts/REGISTRY_AUDIT_PROMPT.md` (слои L0–L3, три корзины).
 *
 * ГРАНИЦА (вердикт M1′ заседания): это **не** вечерний аудитор. Ревизия реестра —
 * отдельный процесс `registry-reaper` со своей каденцией и правом на сеть. Вечерний
 * Док 2 работает по срезу дня и без сети; сюда он не заходит.
 *
 * ГЛАВНЫЙ ПРИНЦИП: «иссью закрыта» — ГИПОТЕЗА, а не вердикт. Живой прогон 18.07:
 * иссью #47 («Пересмотр дорожной карты», stage-gate) закрыта 11 июня и накрывает
 * ПЯТЬ карточек, среди которых `vdr-hard-gate` с невыполненным критерием приёмки
 * (F1 63.4 при гейте 85). Механическая архивация похоронила бы живую работу молча.
 * Поэтому выход — три корзины, а не список на удаление.
 */

/** Карточка «отменена», а не «сделана»: архив тот же, история разная. */
const NOT_PLANNED = 'NOT_PLANNED';

/**
 * Разложить active-карточки по трём корзинам.
 *
 * @param {object[]} tasks карточки реестра
 * @param {Map<number, {state: string, stateReason?: string, title?: string}>} issues
 *   состояние иссью по номеру (пусто = неизвестно → карточка не трогается)
 * @returns {{archive: object[], cancelled: object[], manual: object[], umbrellas: Map<number, object[]>}}
 */
export function auditRegistry(tasks, issues) {
  // `Number(...) > 0` вместо `!= null`: в реестре встречается `githubIssue: 0` как
  // заглушка, а нечисловое дало бы NaN-корзину. Замечание Структурщика на ревью 18.07.
  const active = tasks.filter((t) => t.status === 'active' && Number(t.githubIssue) > 0);

  // Кандидаты: active + иссью закрыта. Это ГИПОТЕЗА (слой L1).
  const candidates = active.filter((t) => issues.get(Number(t.githubIssue))?.state === 'CLOSED');

  // L2: группировка по иссью. Одна иссью → N карточек = ЗОНТИК, красный флаг.
  const byIssue = new Map();
  for (const c of candidates) {
    const n = Number(c.githubIssue);
    if (!byIssue.has(n)) byIssue.set(n, []);
    byIssue.get(n).push(c);
  }
  const umbrellas = new Map([...byIssue].filter(([, cards]) => cards.length > 1));

  const archive = [];
  const cancelled = [];
  const manual = [];

  for (const [n, cards] of byIssue) {
    const issue = issues.get(n);
    if (cards.length > 1) {
      // Зонтик: каждая карточка требует индивидуального вердикта. Никогда пакетом.
      manual.push(...cards.map((c) => ({ ...c, reason: `зонтичная иссью #${n} накрывает ${cards.length} карточек` })));
      continue;
    }
    const card = cards[0];
    if (issue?.stateReason === NOT_PLANNED) {
      cancelled.push({ ...card, reason: `иссью #${n} закрыта как ${NOT_PLANNED} — отменено, не сделано` });
    } else {
      archive.push({ ...card, reason: `иссью #${n} закрыта (COMPLETED), одиночная` });
    }
  }

  return { archive, cancelled, manual, umbrellas };
}

/**
 * Состояние иссью, восстановленное ИЗ РЕЕСТРА — тот же контракт, что даёт `gh`.
 *
 * Ради чего (#620, вердикт DA1): пока состояние закрытия жило только в сети, `audit(x)`
 * зависел от момента вызова, а не от содержимого коммита — воспроизводимости бит-в-бит
 * не существовало. С заполненным `githubIssueClosedAt` аудит считается по срезу репозитория.
 *
 * Карточки без `githubIssueClosedAt` сюда НЕ попадают: «поля нет» — это «не знаю», а не
 * «открыта». Пустая запись безопаснее ложного OPEN, потому что неизвестная иссью просто
 * не становится кандидатом (см. тест «нет данных ≠ закрыта»).
 */
export function issuesFromRegistry(tasks) {
  const issues = new Map();
  for (const t of tasks) {
    const n = Number(t.githubIssue);
    if (!(n > 0) || t.githubIssueClosedAt == null) continue;
    issues.set(n, {
      state: 'CLOSED',
      stateReason: t.githubIssueStateReason ?? 'COMPLETED',
      closedAt: t.githubIssueClosedAt,
    });
  }
  return issues;
}

/**
 * Единственные два состояния закрытия, которые различает GitHub. Полнота enum важна:
 * потеря `NOT_PLANNED` слила бы «отменено» с «сделано» — запрет вердикта H1.
 */
export const ISSUE_STATE_REASONS = ['COMPLETED', 'NOT_PLANNED'];

/**
 * ПЛАН синхронизации состояния иссью — чистая функция, решение отделено от записи.
 *
 * Вынесено из тела скрипта по замечанию ревью 18.07: пока решение жило внутри цикла с
 * записью на диск, его нельзя было ни проверить тестом, ни увидеть в diff — ревьюер
 * обоснованно назвал это слепой зоной провенанса.
 *
 * ВАЖНО про «сдвиг даты назад». Перезапись более ранней датой — не потеря факта, а
 * ИСПРАВЛЕНИЕ: `task:close-github` писал дату СВОЕГО ПРОГОНА, а GitHub отдаёт момент
 * реального закрытия, обычно на 1–2 дня раньше. Замер 18.07: 121 из 319 дат разъезжались.
 * Источник истины здесь ровно один — `closedAt` от `gh`; локальное значение авторитетом
 * не считается, поэтому downgrade разрешён сознательно и покрыт тестом.
 *
 * @param {object[]} tasks карточки реестра
 * @param {Map<number, {state: string, stateReason?: string, closedAt?: string}>} issues
 * @returns {{updates: Array<{task: object, closedAt: string|null, stateReason: string|null, kind: 'closed'|'reopened'}>}}
 */
export function planIssueStateSync(tasks, issues) {
  const updates = [];
  for (const task of tasks) {
    const n = Number(task.githubIssue);
    if (!(n > 0)) continue; // нет иссью — нечего синхронизировать (дата взяться неоткуда)
    const issue = issues.get(n);
    if (!issue) continue; // нет данных ≠ закрыта: карточку не трогаем

    if (issue.state === 'CLOSED') {
      const closedAt = (issue.closedAt ?? '').slice(0, 10) || null;
      // Неизвестный/отсутствующий reason → COMPLETED: молчание не означает «отменено».
      const raw = issue.stateReason ?? 'COMPLETED';
      const stateReason = ISSUE_STATE_REASONS.includes(raw) ? raw : 'COMPLETED';
      if (task.githubIssueClosedAt !== closedAt || task.githubIssueStateReason !== stateReason) {
        updates.push({ task, closedAt, stateReason, kind: 'closed' });
      }
    } else if (task.githubIssueClosedAt != null) {
      // Иссью переоткрыли: снимаем дату, иначе реестр врёт «закрыто» и офлайн-аудит
      // предложит архивацию живой работы. Синхронизация двусторонняя, не только «вперёд».
      updates.push({ task, closedAt: null, stateReason: null, kind: 'reopened' });
    }
  }
  return { updates };
}

/** Систематические дефекты реестра — находки уровня схемы, а не отдельных карточек. */
export function registryDefects(tasks) {
  const defects = [];
  // Номер иссью должен быть положительным: `githubIssue: 0` в реестре встречается как
  // заглушка и давал фантомный зонтик «#0→2» на живом прогоне 18.07.
  const active = tasks.filter((t) => t.status === 'active' && Number(t.githubIssue) > 0);

  const withClosedAt = active.filter((t) => t.githubIssueClosedAt != null).length;
  if (active.length > 0 && withClosedAt === 0) {
    defects.push(
      `поле githubIssueClosedAt не заполнено ни у одной из ${active.length} active-карточек с иссью — ` +
        'состояние закрытия недоступно офлайн, аудит не воспроизводим по коммиту. ' +
        'Чинится: yarn tasks:sync-issues',
    );
  }

  // Одна иссью на несколько ЛЮБЫХ карточек — зонтик, даже если ещё открыта.
  const byIssue = new Map();
  for (const t of active) {
    const n = Number(t.githubIssue);
    byIssue.set(n, (byIssue.get(n) ?? 0) + 1);
  }
  const shared = [...byIssue].filter(([, k]) => k > 1);
  if (shared.length > 0) {
    defects.push(
      `зонтичных иссью: ${shared.length} (${shared.map(([n, k]) => `#${n}→${k}`).join(', ')}) — ` +
        'схема не помечает эпик/дорожную карту, ловушка ловится только глазами',
    );
  }

  return defects;
}
