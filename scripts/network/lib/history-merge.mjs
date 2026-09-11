/**
 * Слияние ЛЕНТЫ СНИМКОВ сети — чистое ядро (блок history-merge, 10.09).
 *
 * ПОЧЕМУ `union` ЗДЕСЬ НЕВЕРЕН. Правило `docs/network/history/**\/*.jsonl merge=union`
 * (#2096, вторая очередь) применило к ленте союзное сложение строк. Но сам .gitattributes
 * двумя абзацами выше говорит, ЧТО под союз не идёт: «снимки состояния… всё, где важно
 * ПОСЛЕДНЕЕ значение, а не сумма строк». Лента снимков — ряд замеров, а не журнал событий:
 * две ветки, померившие сеть в один момент, пишут про ОДИН момент две разные строки.
 * Союз склеивает обе, и результат — точный повтор момента и перепутанный порядок.
 *
 * Цена вчерашнего дня (09.09): четыре ручных разведения, красный прогон, один отказ ревью.
 * Причина — не ветки: проверка перед отправкой требует свежего снимка (зуб `network:tooth`,
 * 48 часов), поэтому снимок пишет КАЖДАЯ ветка, и лента конфликтует у любых двух.
 *
 * ПОЧЕМУ НЕ ВТОРОЙ ПУТЬ — вывести ленту из-под требования свежести. Он дешевле, но платит
 * предметом: зуб 48 часов держит правило «воспоминание не выдаёт себя за факт», ровно тот
 * класс лжи, ради которого заведён контейнер network. Менять предмет на удобство слияния
 * нельзя; чинить надо то, что сломано, — применённое не по адресу правило.
 *
 * ЧТО ДЕЛАЕТ ДРАЙВЕР. Перегенерирует ленту из обеих сторон: берёт все замеры, снимает
 * двойников по паре «момент + машина» и восстанавливает порядок времени. Замер — не
 * событие: два замера одного момента с одной машины это ОДИН замер, записанный дважды.
 */

/** Ключ замера: момент и машина. Один момент на одной машине — один замер. */
export function measureKey(entry) {
  return `${entry?.at ?? ''}::${entry?.host ?? ''}`;
}

/**
 * Разобрать ленту. Битая строка — ОШИБКА ВХОДА, а не пропуск: молча выброшенный замер
 * и есть та потеря, от которой слияние защищают.
 *
 * @param {string} text
 * @returns {{ok: true, entries: object[]} | {ok: false, problems: string[]}}
 */
export function parseHistory(text) {
  const entries = [];
  const problems = [];
  const lines = String(text ?? '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const s = lines[i].trim();
    if (!s) continue;
    let raw;
    try {
      raw = JSON.parse(s);
    } catch {
      problems.push(`строка ${i + 1}: не разбирается как JSON`);
      continue;
    }
    if (!raw || typeof raw !== 'object' || typeof raw.at !== 'string') {
      problems.push(`строка ${i + 1}: замер без момента (поле at) — рядом с чем его ставить, неизвестно`);
      continue;
    }
    entries.push(raw);
  }
  return problems.length ? { ok: false, problems } : { ok: true, entries };
}

/**
 * Слить две стороны ленты.
 *
 * Двойник по ключу «момент+машина» снимается; если стороны записали ОДИН момент
 * по-разному, это не конфликт работы, а два наблюдения одного замера — берётся сторона
 * `ours`, и факт называется вслух (`redefined`), а не замалчивается.
 *
 * @param {object[]} base предок (для обнаружения удалений он не нужен: лента append-only)
 * @param {object[]} ours наша сторона
 * @param {object[]} theirs их сторона
 * @returns {{entries: object[], added: number, duplicates: number, redefined: string[]}}
 */
export function mergeHistories(base, ours, theirs) {
  const byKey = new Map();
  const redefined = [];
  let duplicates = 0;

  for (const entry of [...(ours ?? []), ...(theirs ?? [])]) {
    const key = measureKey(entry);
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, entry);
      continue;
    }
    duplicates += 1;
    if (JSON.stringify(seen) !== JSON.stringify(entry)) redefined.push(key);
  }

  const entries = [...byKey.values()].sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (ta !== tb) return ta - tb;
    // Один момент, разные машины — порядок задаёт имя, чтобы слияние было детерминированным.
    return String(a.host ?? '').localeCompare(String(b.host ?? ''));
  });

  const baseKeys = new Set((base ?? []).map(measureKey));
  return {
    entries,
    added: entries.filter((e) => !baseKeys.has(measureKey(e))).length,
    duplicates,
    redefined,
  };
}

/** Лента обратно в текст: по одному замеру на строку, перевод строки в конце. */
export function renderHistory(entries) {
  return entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
}
