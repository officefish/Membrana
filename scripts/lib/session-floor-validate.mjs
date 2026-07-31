/**
 * Валидация инвентаря в момент выдачи пола — **уровень 1** (§6 контракта `workshop-wires`).
 *
 * Хук отдаёт пол и **в тот же момент** проверяет то, из чего пол собран: разбор манифестов,
 * читаемость реестра, полнота проекции, опционально дрейф штампов.
 *
 * ДВА ИСХОДА И НИ ОДНОГО ТРЕТЬЕГО: `ok` либо `degraded` с причинами. Провала нет как класса —
 * §6 говорит прямо: **сессию не блокирует, автопочинки нет**. Причина не в мягкости: старт
 * сессии — не то место, где уместно останавливать человека из-за битого манифеста в чужом
 * контейнере. Он пришёл работать, а не чинить инвентарь; сказать ему правду достаточно.
 *
 * АВТОПОЧИНКИ НЕТ — тоже несущее. Молча дописать недостающее значит скрыть от владельца
 * дерева, что у него что-то разъехалось, и сделать это ровно в тот момент, когда он смотрит
 * в экран и мог бы заметить.
 */

/** Исходы уровня 1. Список ЗАКРЫТ. */
export const FLOOR_HEALTH = Object.freeze({ OK: 'ok', DEGRADED: 'degraded' });

/** Роды причин деградации — чтобы отчёт группировал, а не сваливал в один список. */
export const DEGRADE_KINDS = Object.freeze({
  MANIFEST: 'manifest',
  REGISTRY: 'registry',
  PROJECTION: 'projection',
  STAMPS: 'stamps',
});

/** Порог просрочки второго уровня — неделя (§6: «сигнал при разрыве больше недели»). */
export const SECOND_LEVEL_STALE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Проверить пол.
 *
 * @param {object} floor проекция из `session-floor.mjs`
 * @param {{now?: string|null}} [opts] `now` — момент проверки; часы внутрь не пускаются
 * @returns {{health: string, reasons: {kind: string, text: string}[], secondLevel: string}}
 */
export function validateFloor(floor, opts = {}) {
  const reasons = [];
  const say = (kind, text) => reasons.push({ kind, text });

  // Манифесты: невалидная мастерская остаётся В ВЫДАЧЕ, но помечается. Убрать её значило бы
  // спрятать дом от сессии за то, что у него испорчен паспорт, — и сессия пошла бы грепать
  // ровно туда, куда есть законная дверь.
  const broken = (floor?.workshops ?? []).filter((w) => w.valid === false);
  if (broken.length > 0) {
    say(DEGRADE_KINDS.MANIFEST, `манифест не разобран у ${broken.length}: ${broken.map((w) => w.home).join(', ')}`);
  }

  // Реестр: любое состояние, кроме ok, — деградация с названной причиной.
  if (floor?.registryState !== 'ok') {
    const detail = (floor?.registryProblems ?? []).join('; ') || 'причина не названа';
    say(DEGRADE_KINDS.REGISTRY, `реестр неймспейсов: ${String(floor?.registryState)} — ${detail}`);
  }

  // Полнота проекции: пустой список мастерских на непустом дереве — это не «чисто».
  if (!Array.isArray(floor?.workshops) || floor.workshops.length === 0) {
    say(DEGRADE_KINDS.PROJECTION, 'мастерских не найдено ни одной — проекция пуста, а не дерево');
  }
  const noVerb = (floor?.workshops ?? []).filter((w) => w.entryVerb === null);
  if (noVerb.length > 0 && noVerb.length === (floor?.workshops ?? []).length) {
    // Прочерк у одной мастерской законен; прочерк у ВСЕХ значит, что глаголы не прочитались.
    say(DEGRADE_KINDS.PROJECTION, 'входного глагола нет ни у одной мастерской — вероятно, не прочитались манифесты');
  }

  // Штампы: их отсутствие — не ошибка (сеть могла быть недоступна), но и утверждать
  // ненаблюдённое нельзя. §6: «нет сети — не заявлять состояние origin».
  if (floor?.stamps === null || floor?.stamps === undefined) {
    say(DEGRADE_KINDS.STAMPS, 'штампов свежести нет — состояние origin не наблюдалось и не заявляется');
  }

  return {
    health: reasons.length === 0 ? FLOOR_HEALTH.OK : FLOOR_HEALTH.DEGRADED,
    reasons,
    secondLevel: secondLevelState(floor?.secondLevelAt, opts.now ?? floor?.now ?? null),
  };
}

/**
 * Состояние второго уровня инвентаризации.
 *
 * Три исхода, и «неизвестно» — не то же, что «просрочен»: процедура могла ни разу не
 * прогоняться, и объявлять её просроченной значит обвинять за несделанное первое.
 */
export function secondLevelState(atIso, nowIso) {
  const at = typeof atIso === 'string' ? Date.parse(atIso) : NaN;
  const now = typeof nowIso === 'string' ? Date.parse(nowIso) : NaN;
  if (!Number.isFinite(at)) return 'неизвестно';
  if (!Number.isFinite(now)) return 'неизвестно';
  return now - at > SECOND_LEVEL_STALE_DAYS * DAY_MS ? 'просрочен' : 'свеж';
}

/**
 * Строки отчёта уровня 1 для выдачи.
 *
 * Полоса статуса идёт ПЕРВОЙ строкой — §6 требует этого для деградации отдельно
 * («честная пустота с полосой DEGRADED первой строкой»). Читатель узнаёт о неполноте
 * до того, как начнёт верить содержимому, а не после.
 */
export function renderHealth(result) {
  const lines = [];
  if (result.health === FLOOR_HEALTH.OK) {
    lines.push(`инвентарь: ok · второй уровень: ${result.secondLevel}`);
  } else {
    lines.push(`DEGRADED · инвентарь неполон (${result.reasons.length}) · второй уровень: ${result.secondLevel}`);
    for (const r of result.reasons) lines.push(`  ${r.kind}: ${r.text}`);
    lines.push('  сессия не блокируется, автопочинки нет — чинить руками');
  }
  return lines;
}
