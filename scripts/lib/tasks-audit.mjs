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
  const active = tasks.filter((t) => t.status === 'active' && t.githubIssue != null);

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
        'состояние закрытия недоступно офлайн, аудит не воспроизводим по коммиту',
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
