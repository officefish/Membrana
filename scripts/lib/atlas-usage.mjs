/**
 * Вывод примеров вызова в справочник — поле `usage` манифеста (поправка Ф1 от 31.07).
 *
 * Атлас **агрегирует**, а не сочиняет: `what` и `sample` приходят из манифеста мастерской и
 * здесь только раскладываются по строкам. Собственного текста об инструментах справочник не
 * держит — §3 запрещает копии прямым пунктом («иначе эхо-дрейф, тот самый, против которого
 * паттерн»).
 *
 * ВОЗРАСТ ПОКАЗЫВАЕТСЯ, СВЕЖЕСТЬ НЕ ОБЕЩАЕТСЯ. Вывод инструмента меняется законно, и сверить
 * `sample` с реальностью машинно нельзя. Поэтому рядом с примером печатается дата прогона —
 * читатель видит снимок и его возраст, а не «актуальное состояние». Тот же приём, которым
 * живут штампы свежести холодного старта.
 */

/** Сколько строк примера показывать в индексе. Длинный вывод режется с честным хвостом. */
export const SAMPLE_MAX_LINES = 4;

/**
 * Собрать записи примеров по мастерским.
 *
 * @param {readonly object[]} containers из `discoverContainers`
 * @returns {{home: string, verb: string, command: string|null, what: string, sample: string[], measuredAt: string, truncated: number}[]}
 */
export function collectUsage(containers) {
  const out = [];
  for (const c of containers ?? []) {
    const usage = c?.usage;
    if (usage === null || typeof usage !== 'object' || Array.isArray(usage)) continue;
    for (const [verb, rec] of Object.entries(usage)) {
      if (rec === null || typeof rec !== 'object') continue;
      const all = String(rec.sample ?? '').split('\n');
      out.push({
        home: c.home,
        verb,
        // Команда берётся из `verbs`, а не из примера: пример показывает ВЫВОД, а вызывать
        // надо то, что объявлено глаголом. Разъехаться они не могут — зуб держит подмножество.
        command: c.commands?.[verb] ?? null,
        what: String(rec.what ?? ''),
        sample: all.slice(0, SAMPLE_MAX_LINES),
        measuredAt: String(rec.measuredAt ?? ''),
        truncated: Math.max(0, all.length - SAMPLE_MAX_LINES),
      });
    }
  }
  return out.sort((a, b) => a.home.localeCompare(b.home) || a.verb.localeCompare(b.verb));
}

/**
 * Секция примеров для `ATLAS.md`.
 *
 * Пустота печатается СЛОВАМИ: «примеров ни у одной мастерской» — а не молчанием. Отсутствие
 * секции читалось бы как «примеры не предусмотрены», тогда как правда — «поле есть, никто не
 * заполнил». Разница ровно та же, что между «правил членства ноль» и «реестра нет».
 *
 * @param {readonly object[]} entries из {@link collectUsage}
 * @param {number} workshopCount сколько всего мастерских — для честной доли
 */
export function renderUsageSection(entries, workshopCount = 0) {
  const lines = [];
  lines.push('## Примеры вызова');
  lines.push('');
  if (entries.length === 0) {
    lines.push(`Примеров нет ни у одной из **${workshopCount}** мастерских. Поле \`usage\` (Ф1, поправка 31.07) не заполнено — это НЕ значит «инструменты без вывода», значит «пример ещё не снят».`);
    lines.push('');
    return lines;
  }
  const homes = new Set(entries.map((e) => e.home));
  lines.push(`Заполнено у **${homes.size}** мастерских из **${workshopCount}**. Источник — \`usage\` в манифесте; здесь производная выжимка.`);
  lines.push('');
  lines.push('**Вывод — снимок, а не гарантия.** Рядом с каждым примером дата прогона: сверить его с текущим состоянием машинно нельзя, поэтому показан возраст.');
  lines.push('');
  for (const e of entries) {
    lines.push(`### \`${e.command ?? e.verb}\` — ${e.home}`);
    lines.push('');
    lines.push(e.what);
    lines.push('');
    lines.push('```text');
    for (const l of e.sample) lines.push(l);
    if (e.truncated > 0) lines.push(`… и ещё ${e.truncated} строк(и)`);
    lines.push('```');
    lines.push('');
    lines.push(`_замер ${e.measuredAt}_`);
    lines.push('');
  }
  return lines;
}

/**
 * Мастерские, у которых примеров нет.
 *
 * Отдельная функция, потому что это **предъявляемый список**, а не ощущение: заполнение
 * `usage` идёт поштучно и растянуто во времени, и без поимённого перечня «почти всё
 * заполнено» через месяц будет означать что угодно.
 */
export function workshopsWithoutUsage(containers) {
  return (containers ?? [])
    .filter((c) => c.kind === 'workshop')
    .filter((c) => {
      const u = c?.usage;
      return u === null || u === undefined || typeof u !== 'object' || Object.keys(u).length === 0;
    })
    .map((c) => c.home)
    .sort();
}
