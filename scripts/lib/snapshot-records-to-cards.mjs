/**
 * Адаптер (а) Phase 4 — cowork-execution-registry (INTERFACE_CONTRACT §6).
 *
 * Проекция `records[]` снимка `linear-snapshot@1` (производитель — блок
 * snapshot-cold-migration) в вид входа `computeTeamMetrics` / гейтов зубов
 * (потребитель — блок units-trace-measure): `{ header, cards }`.
 *
 * Закон Phase 4: блоки НЕ переписываются — несогласованность имён и форм
 * гасится здесь. Правила проекции:
 *
 * - **Запись снимка ≠ единица счёта** (§1.2): запись — сырая Linear-issue,
 *   единица счёта — GitHub-issue через биекцию центральной под-задачи
 *   (`githubIssueRefs`). Одна карточка на один GitHub-issue; двойной счёт
 *   исключён по построению. Запись без паспорта единицей не становится —
 *   попадает в `dropped.noPassport` (наблюдаемо, не молча).
 * - Носитель полей единицы — центральная под-задача (запись с `parentId ≠ null`),
 *   при её отсутствии — любой носитель ссылки (контейнер); выбор детерминирован
 *   (сортировка по `linearId`), коллизии видимы в `collisions`.
 * - Имена полей: `state/stateType → status` (словарь ниже), `assignee →
 *   leadPersona` (тождество по функции, UNITS_DICTIONARY §3; нормализация
 *   через канонический реестр псевдонимов), `completedAt → closedAt`.
 * - Поле, которого у производителя нет (`archivedAt`), проецируется в `null` —
 *   величина честно не считается, не домысливается (§1.2).
 * - Вход без провенанса отвергается (инвариант §3): снимок валидируется
 *   контрактом производителя ДО проекции.
 */

import { validateSnapshot } from './snapshot-contract.mjs';
import { normalizePersona } from './standup-routing.mjs';

/**
 * Интерпретация «что движется» — у словаря единиц (UNITS_DICTIONARY §1, §4):
 * движущиеся статусы потребителя — `open` / `in-progress`; закрытие — `closed`.
 * Ключи — канонические `stateType` Linear. Неизвестный `stateType` проходит
 * как есть: в движущиеся не попадает — честная деградация, не домысливание.
 */
export const STATE_TYPE_TO_STATUS = Object.freeze({
  triage: 'open',
  backlog: 'open',
  unstarted: 'open',
  started: 'in-progress',
  completed: 'closed',
  canceled: 'closed',
});

/** Детерминированный id единицы счёта: GitHub-issue (паспорт). */
export function unitId(githubIssueRef) {
  return `gh-${githubIssueRef}`;
}

function statusOf(record) {
  return STATE_TYPE_TO_STATUS[record.stateType] ?? record.stateType ?? null;
}

function personaOf(record) {
  if (typeof record.leadPersona === 'string' && record.leadPersona.trim().length > 0) {
    // Запись уже несёт каноническое поле — проекция ничего не изобретает.
    return normalizePersona(record.leadPersona);
  }
  if (typeof record.assignee === 'string' && record.assignee.trim().length > 0) {
    // assignee ↔ leadPersona — тождество по функции (UNITS_DICTIONARY §3);
    // с delegatedAgent НЕ склеивается (§1.3 контракта, вердикт M1).
    return normalizePersona(record.assignee);
  }
  return null; // поля нет → ownerlessRate увидит правду, не выдумку
}

function byLinearId(a, b) {
  return a.linearId < b.linearId ? -1 : a.linearId > b.linearId ? 1 : 0;
}

/**
 * Проекция снимка производителя в снимок-вход потребителя.
 *
 * @param {{ header: object, records: object[] }} snapshot снимок `linear-snapshot@1`
 * @returns {{
 *   header: { capturedAt: string, sourceRevision: string },
 *   cards: {
 *     id: string, status: string | null, leadPersona: string | null,
 *     createdAt: string | null, closedAt: string | null, archivedAt: string | null,
 *     githubIssue: number, linearId: string,
 *   }[],
 *   dropped: { noPassport: string[] },
 *   collisions: { githubIssue: number, linearIds: string[], picked: string }[],
 * }}
 * @throws {Error} снимок без провенанса / не по контракту — входом не является
 */
export function projectSnapshotToCards(snapshot) {
  const { ok, problems } = validateSnapshot(snapshot);
  if (!ok) {
    throw new Error(
      `projectSnapshotToCards: вход не является снимком linear-snapshot@1 — ${problems.join('; ')}`,
    );
  }

  /** @type {Map<number, object[]>} GitHub-issue → записи-носители ссылки */
  const carriers = new Map();
  const noPassport = [];
  for (const record of snapshot.records) {
    const refs = Array.isArray(record.githubIssueRefs) ? record.githubIssueRefs : [];
    if (refs.length === 0) {
      noPassport.push(record.linearId ?? '<без linearId>');
      continue;
    }
    // «Один контейнер : N GitHub-issue» счёта не ломает (UNITS_DICTIONARY §2):
    // запись становится кандидатом-носителем каждой своей ссылки.
    for (const ref of new Set(refs)) {
      if (!carriers.has(ref)) carriers.set(ref, []);
      carriers.get(ref).push(record);
    }
  }

  const cards = [];
  const collisions = [];
  const refs = [...carriers.keys()].sort((a, b) => a - b);
  for (const ref of refs) {
    const candidates = carriers.get(ref);
    // Биекция «центральная под-задача ↔ Issue»: предпочитаем под-задачу
    // (parentId ≠ null) — она носитель движения; контейнер — запасной носитель.
    const central = candidates.filter((r) => r.parentId !== null && r.parentId !== undefined);
    const pool = (central.length > 0 ? central : candidates).slice().sort(byLinearId);
    const carrier = pool[0];
    if (candidates.length > 1) {
      collisions.push({
        githubIssue: ref,
        linearIds: candidates.map((r) => r.linearId).sort(),
        picked: carrier.linearId,
      });
    }
    cards.push({
      id: unitId(ref),
      status: statusOf(carrier),
      leadPersona: personaOf(carrier),
      createdAt: carrier.createdAt ?? null,
      closedAt: carrier.completedAt ?? carrier.closedAt ?? null,
      // Производитель archivedAt не отдаёт (§1.2) — честный null, не догадка.
      archivedAt: carrier.archivedAt ?? null,
      githubIssue: ref,
      linearId: carrier.linearId,
    });
  }

  return {
    // Шапка потребителя — строгое подмножество шапки производителя (§1.2).
    header: {
      capturedAt: snapshot.header.capturedAt,
      sourceRevision: snapshot.header.sourceRevision,
    },
    cards,
    dropped: { noPassport },
    collisions,
  };
}
