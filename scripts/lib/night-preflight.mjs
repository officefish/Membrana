/**
 * Ядро стража ночи — ЧИСТЫЕ предикаты полосы `preflight` процедуры `ritual-night`.
 *
 * ЗАЧЕМ ПОЛОСА ВООБЩЕ ЕСТЬ. Недельный стратегический план падал СЕМНАДЦАТЬ раз подряд с 14 мая с
 * одной причиной — «секрет не задан». Канон фреймов называет этот класс дословно, и не про ночь, а
 * про утро: «у процедуры нет фрейма, отвечающего за провода, — некому было объявить канал».
 * Механизм был исправен; отсутствовал тот, кто спросит про ключи ДО работы.
 *
 * ПОЧЕМУ ЯДРО ОТДЕЛЬНО ОТ CLI. Здесь нет ни сети, ни файлов, ни печати: вердикт — функция от
 * значений. Иначе проверить «страж краснеет на снятом ключе» можно было бы только сняв настоящий
 * ключ у настоящей машины, то есть свидетельство пришлось бы добывать не там, где живёт риск.
 *
 * ЗНАЧЕНИЯ КЛЮЧЕЙ НЕ ПОКАЗЫВАЮТСЯ НИКОГДА. Наружу идут ИМЯ переменной и имя провайдера — этого
 * оператору достаточно, чтобы починить. Правило то же, что в процедуре разворачивания (Р3
 * ADR-0023): секреты и env-значения в журнал не пишутся. 23.08 обратное стоило нам живого токена.
 */

/** Ключ провайдера считается заданным, если он есть и непуст после обрезки. */
export function keyPresent(env, name) {
  return typeof env?.[name] === 'string' && env[name].trim().length > 0;
}

/**
 * Разбор одной цепочки: какие звенья годны, какие без ключа.
 *
 * ЗВЕНО БЕЗ КЛЮЧА — ЕЩЁ НЕ БЕДА. Цепочка панели это ПОСЛЕДОВАТЕЛЬНОСТЬ запасных: `anthropic →
 * xai → openrouter`. Если у первого ключа нет, а у второго есть, процедура отработает — короче,
 * но отработает. Красить такой прогон в красный значило бы запретить ночь там, где она возможна.
 *
 * БЕДА — КОГДА ГОДНЫХ ЗВЕНЬЕВ НЕТ НИ ОДНОГО. Тогда процедуре идти некуда, и это ровно тот
 * семнадцатикратный случай.
 *
 * @param {ReadonlyArray<{provider: string, model?: string}>} chain
 * @param {Record<string, {apiKeyEnv?: string}>} catalog
 * @param {Record<string, string|undefined>} env
 */
export function chainKeyState(chain, catalog, env) {
  const links = (chain ?? []).map((link) => {
    const provider = String(link?.provider ?? '');
    const spec = catalog?.[provider];
    const envName = spec?.apiKeyEnv ?? null;
    return {
      provider,
      envName,
      // Провайдера нет в каталоге — это НЕ «ключ не задан», а другая поломка: цепочка ссылается
      // на то, чего каталог не знает. Смешивать их нельзя, чинятся они по-разному.
      unknownProvider: !spec,
      usable: Boolean(envName) && keyPresent(env, envName),
    };
  });
  return {
    links,
    usable: links.filter((l) => l.usable),
    missing: links.filter((l) => !l.usable && !l.unknownProvider),
    unknown: links.filter((l) => l.unknownProvider),
  };
}

/**
 * Вердикт фрейма проводов по всем объявленным процедурам канала.
 *
 * `procedureIds` берётся ИЗ МАНИФЕСТА процедуры, а не из этого файла: канон требует, чтобы фрейм
 * `провода` сам называл свой `procedureId`. Страж, знающий канал наизусть, разъедется с манифестом
 * молча — и разъедется именно тогда, когда канал поменяют.
 *
 * @param {Array<{procedureId: string, chain: ReadonlyArray<{provider: string}>}>} resolved
 * @param {Record<string, {apiKeyEnv?: string}>} catalog
 * @param {Record<string, string|undefined>} env
 */
export function wiringVerdict(resolved, catalog, env) {
  const perProcedure = (resolved ?? []).map((r) => {
    const state = chainKeyState(r.chain, catalog, env);
    return {
      procedureId: r.procedureId,
      // Пустая цепочка — тоже «идти некуда», хотя ни один ключ формально не пропал.
      dead: state.usable.length === 0,
      degraded: state.usable.length > 0 && state.missing.length > 0,
      usableCount: state.usable.length,
      linkCount: state.links.length,
      missingEnv: state.missing.map((l) => `${l.provider}:${l.envName}`),
      unknownProviders: state.unknown.map((l) => l.provider),
    };
  });
  const dead = perProcedure.filter((p) => p.dead);
  return {
    ok: dead.length === 0,
    dead,
    degraded: perProcedure.filter((p) => p.degraded),
    perProcedure,
  };
}

/** Итог полосы: `preflight` красен, если провалилась хоть одна ОБЯЗАТЕЛЬНАЯ проба. */
export function preflightVerdict(probes) {
  const required = (probes ?? []).filter((p) => p.required !== false);
  const failed = required.filter((p) => p.status === 'fail');
  return {
    ok: failed.length === 0,
    failed: failed.map((p) => p.id),
    // Findings НЕ красят полосу, но и не молчат: сводка ночи обязана их унести.
    findings: (probes ?? []).filter((p) => p.status === 'finding').map((p) => p.id),
  };
}

/** Слова вердикта проводов — без единого значения ключа. */
export function wiringWords(verdict) {
  if (verdict.ok && verdict.degraded.length === 0) return 'провода целы: у каждой процедуры канала есть годное звено';
  const lines = [];
  for (const p of verdict.dead) {
    lines.push(
      `✗ ${p.procedureId}: годных звеньев НЕТ (${p.linkCount} в цепочке) — идти некуда` +
        (p.missingEnv.length > 0 ? `; без ключа: ${p.missingEnv.join(', ')}` : '') +
        (p.unknownProviders.length > 0 ? `; нет в каталоге: ${p.unknownProviders.join(', ')}` : ''),
    );
  }
  for (const p of verdict.degraded) {
    lines.push(`… ${p.procedureId}: цепочка короче объявленной — ${p.usableCount} из ${p.linkCount}; без ключа: ${p.missingEnv.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Развернуть каталог провайдеров до карты «провайдер → спецификация».
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНАЯ ФУНКЦИЯ, А НЕ `catalog.providers` по месту. `loadProviderCatalog()` отдаёт
 * ОБЁРТКУ `{providers, ritualEnum}`, а ядро судит по карте провайдеров. Первый живой прогон стража
 * покраснел с «нет в каталоге: anthropic, openrouter, deepseek, xai» — то есть обвинил каталог в
 * том, что в нём нет ровно тех, кто в нём есть.
 *
 * СКВОЗЬ ЗУБЫ ЭТО ПРОШЛО ЗЕЛЁНЫМ, и вот почему: зубы кормились самодельным двойником каталога, у
 * которого форма была «правильная» по моему представлению. Свидетельство бралось не там, где живёт
 * риск. Отсюда парный зуб ниже — он читает НАСТОЯЩИЙ файл и сверяет форму двойника с ним.
 */
export function providersOf(catalog) {
  if (catalog && typeof catalog === 'object' && catalog.providers && typeof catalog.providers === 'object') {
    return catalog.providers;
  }
  // Голая карта — тоже законный вход: так каталог выглядит, если его прочитать файлом напрямую.
  return catalog ?? {};
}

/**
 * Аргументы, которых страж не знает.
 *
 * ВЫНЕСЕНО В ЯДРО ПОСЛЕ СОБСТВЕННОГО ПРОМАХА. В CLI стояло
 * `argv.filter((a, i) => !KNOWN.has(a) && i !== onlyIdx + 1)`, и при отсутствии `--only`
 * значение `onlyIdx` равнялось −1, то есть исключался индекс 0 — ПЕРВЫЙ аргумент не проверялся
 * никогда. `node night-preflight.mjs --dry-run` проезжал живьём и запускал все пробы.
 *
 * Это буквально инцидент 11.08 вечерней цепочки, где `--dry-run` (нет такого флага) молча
 * игнорировался и вместо плана шёл живой прогон. Вечерний раннер от него защищён —
 * `onlyValueIdx = onlyIdx >= 0 ? onlyIdx + 1 : -1`; я взял идею и потерял эту оговорку.
 *
 * Найдено ЖИВЫМ ПРОГОНОМ отказа, а не чтением кода: зуба на отказ не было, и код выглядел верным.
 */
export function unknownArgsOf(argv, known) {
  const list = argv ?? [];
  const onlyIdx = list.indexOf('--only');
  const valueIdx = onlyIdx >= 0 ? onlyIdx + 1 : -1;
  return list.filter((a, i) => !known.has(a) && i !== valueIdx);
}
