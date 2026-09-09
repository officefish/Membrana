/**
 * Паспорт гранулы ресурса тарифной матрицы — чистое ядро (спринт tariff-matrix-2331, блок b1).
 *
 * Матрица тарифов в контейнере strategic-docs — единственный источник правды (T13–T16 шторма
 * `storm-tariff-single-truth-2026-09-08`). Каждая гранула `granules/tariff-*` несёт ОДИН файл
 * значений — `resource.json` (схема `tariff-resource/1`): паспорт (версия, дата закрепления,
 * владелец, источник), ресурс, единица, домен, правило пересева и значения по трём тарифам.
 * Тариф — колонка, ресурс — строка (T14).
 *
 * Здесь — только предикаты и слова строки: без fs, без сети. Файлы читают гранулы
 * (`render.mjs`) и зуб (`passport.test.mjs`). Пересев (b4) читает ту же форму.
 *
 * Дизайн: docs/containers/strategic-docs/design/TARIFF-MATRIX-DESIGN.md
 */

export const SCHEMA = 'tariff-resource/1';

/** Три тарифа владельца — закрытый список; порядок колонок = rank, не порядок ключей в файле. */
export const SKUS = Object.freeze([
  Object.freeze({ sku: 'free-v1', rank: 0, productName: 'Датчик' }),
  Object.freeze({ sku: 'checkpoint-v1', rank: 1, productName: 'Блокпост' }),
  Object.freeze({ sku: 'observatory-v1', rank: 2, productName: 'Наблюдательный пункт' }),
]);
export const SKU_IDS = Object.freeze(SKUS.map((s) => s.sku));

/** Ось «что именно ограничивает паспорт»: хранение, доступ, каталог или инструмент. */
export const DOMAINS = Object.freeze(['storage', 'rights', 'catalog', 'instrument']);

/** Роды права — те же, что в сетке (`scripts/lib/tariff-grid-check.mjs` KINDS). */
export const KINDS = Object.freeze(['quota', 'catalog', 'instrument', 'gated', 'produce']);

/** Единицы паспорта. `MiB` — мебибайты (не «МБ»); пересчёт в байты — только у render и пересева. */
export const UNITS = Object.freeze(['MiB', 'count', null]);

/**
 * Правила пересева — закрытый список (замечание Веснина: зуб проверяет замкнутость, не наличие).
 *  exact-bytes            число МиБ из гранулы едет в сетку байтами (unit MiB → bytes)
 *  exact-count            число штук едет в сетку как есть (unit count)
 *  catalog-id             идентификатор набора едет строкой как есть
 *  enabled-flag           булево «включено», без значения
 *  gated-by-precondition  булево + идентификатор условия; условие сетка берёт из паспорта
 *  produce-scope          булево + перечень того, что разрешено производить
 *  matrix-only            строка живёт только в матрице; пересев такие записи пропускает
 */
export const RESEED_RULES = Object.freeze([
  'exact-bytes',
  'exact-count',
  'catalog-id',
  'enabled-flag',
  'gated-by-precondition',
  'produce-scope',
  'matrix-only',
]);

/** Закрытая связка род ↔ правило пересева. */
export const KIND_RULES = Object.freeze({
  quota: Object.freeze(['exact-bytes', 'exact-count']),
  catalog: Object.freeze(['catalog-id', 'matrix-only']),
  instrument: Object.freeze(['enabled-flag']),
  gated: Object.freeze(['gated-by-precondition']),
  produce: Object.freeze(['produce-scope']),
});

/** Правило ↔ единица: у байтов — MiB, у штук — count, у остальных единицы нет. */
const RULE_UNIT = Object.freeze({
  'exact-bytes': 'MiB',
  'exact-count': 'count',
  'catalog-id': null,
  'enabled-flag': null,
  'gated-by-precondition': null,
  'produce-scope': null,
  'matrix-only': null,
});

const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const mibToBytes = (mib) => (mib == null ? null : mib * 1024 * 1024);

const finding = (toothId, where, reason) => ({ toothId, where, reason });
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v) && v >= 0;

/** Дата закрепления: ISO-день или честный null («не закреплено»). Отсутствие ключа — дефект. */
function checkRatifiedAt(holder, where, out) {
  if (!isObj(holder) || !('ratifiedAt' in holder)) {
    out.push(finding('passport_fields', where, 'нет ratifiedAt — закреплено или нет, надо сказать явно (дата или null)'));
    return;
  }
  const v = holder.ratifiedAt;
  if (v !== null && !(typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)))) {
    out.push(finding('passport_fields', where, `ratifiedAt «${v}» — не ISO-дата и не null`));
  }
}

function checkPassport(passport, out) {
  if (!isObj(passport)) {
    out.push(finding('passport_fields', 'passport', 'паспорта нет'));
    return;
  }
  if (!SEMVER.test(String(passport.version ?? ''))) {
    out.push(finding('passport_fields', 'passport.version', `версия «${passport.version}» — не точный semver x.y.z`));
  }
  checkRatifiedAt(passport, 'passport', out);
  if (!isStr(passport.owner)) out.push(finding('passport_fields', 'passport.owner', 'владелец не назван'));
  if (!isStr(passport.source)) out.push(finding('passport_fields', 'passport.source', 'источник (шторм/заседание) не назван'));
}

function checkRegistry(registry, where, out) {
  if (!isObj(registry)) {
    out.push(finding('registry_fields', where, 'нет registry — сетке нечем подписать право'));
    return;
  }
  if (!isStr(registry.titleKey)) out.push(finding('registry_fields', `${where}.titleKey`, 'нет titleKey'));
  if (!isStr(registry.description)) out.push(finding('registry_fields', `${where}.description`, 'нет description'));
}

/** Форма значения по правилу пересева. Лишние ключи, лгущие о единице («MB»), — красный. */
function checkValue(rule, value, where, out) {
  if (!isObj(value)) {
    out.push(finding('value_shape', where, 'значение — не объект'));
    return;
  }
  checkRatifiedAt(value, where, out);
  for (const bad of ['MB', 'mb', 'megabytes', 'bytes', 'limit']) {
    if (bad in value) out.push(finding('value_shape', `${where}.${bad}`, `ключ «${bad}» запрещён: в паспорте МиБ (MiB), байты — у пересева`));
  }
  if ('stub' in value) {
    const s = value.stub;
    if (!isObj(s) || !isStr(s.since) || !ISO_DATE.test(s.since) || !isStr(s.reason) || !isStr(s.resolvesBy)) {
      out.push(finding('value_shape', `${where}.stub`, 'заглушка обязана нести since (ISO), reason и resolvesBy словами'));
    }
    if (value.ratifiedAt !== null) {
      out.push(finding('value_shape', `${where}.ratifiedAt`, 'заём/заглушка не может быть закреплённым значением — ratifiedAt обязан быть null'));
    }
  }
  if ('label' in value && !isStr(value.label)) out.push(finding('value_shape', `${where}.label`, 'label пуст'));

  switch (rule) {
    case 'exact-bytes':
      if (!isInt(value.MiB)) out.push(finding('value_shape', `${where}.MiB`, 'квота в МиБ обязана быть целым числом ≥ 0'));
      break;
    case 'exact-count':
      if (!isInt(value.count)) out.push(finding('value_shape', `${where}.count`, 'квота в штуках обязана быть целым числом ≥ 0'));
      break;
    case 'catalog-id':
      if (!isStr(value.catalogId)) out.push(finding('value_shape', `${where}.catalogId`, 'нет catalogId'));
      break;
    case 'enabled-flag':
      if (typeof value.enabled !== 'boolean') out.push(finding('value_shape', `${where}.enabled`, 'enabled обязан быть булевым'));
      break;
    case 'gated-by-precondition':
      if (typeof value.enabled !== 'boolean') out.push(finding('value_shape', `${where}.enabled`, 'enabled обязан быть булевым'));
      if (!isStr(value.preconditionId)) out.push(finding('value_shape', `${where}.preconditionId`, 'возможность-с-предусловием без preconditionId'));
      break;
    case 'produce-scope':
      if (typeof value.enabled !== 'boolean') out.push(finding('value_shape', `${where}.enabled`, 'enabled обязан быть булевым'));
      if (value.enabled && !(Array.isArray(value.scope) && value.scope.length > 0 && value.scope.every(isStr))) {
        out.push(finding('value_shape', `${where}.scope`, 'право производить включено, но перечень scope пуст'));
      }
      if (!value.enabled && Array.isArray(value.scope) && value.scope.length > 0) {
        out.push(finding('value_shape', `${where}.scope`, 'право выключено, а scope назван — противоречие'));
      }
      break;
    case 'matrix-only':
      if (typeof value.available !== 'boolean' || typeof value.outsideQuota !== 'boolean') {
        out.push(finding('value_shape', where, 'строка только-в-матрице несёт available и outsideQuota (булевы)'));
      }
      break;
    default:
      break;
  }
  if (rule !== 'matrix-only' && ('available' in value || 'outsideQuota' in value)) {
    out.push(finding('value_shape', where, 'available/outsideQuota допустимы только при правиле matrix-only'));
  }
}

function checkEntry(entry, where, out) {
  if (!isStr(entry.id)) out.push(finding('entry_fields', `${where}.id`, 'нет id'));
  if (!isStr(entry.resource)) out.push(finding('entry_fields', `${where}.resource`, 'нет resource (id права в сетке)'));
  if (!isStr(entry.title)) out.push(finding('entry_fields', `${where}.title`, 'нет заголовка строки для человека'));
  if (!KINDS.includes(entry.kind)) out.push(finding('closed_list', `${where}.kind`, `род «${entry.kind}» вне закрытого списка ${KINDS.join('|')}`));
  if (!RESEED_RULES.includes(entry.reseedRule)) {
    out.push(finding('closed_list', `${where}.reseedRule`, `правило пересева «${entry.reseedRule}» вне закрытого списка ${RESEED_RULES.join('|')}`));
  } else if (KINDS.includes(entry.kind) && !KIND_RULES[entry.kind].includes(entry.reseedRule)) {
    out.push(finding('kind_rule', `${where}.reseedRule`, `род «${entry.kind}» не пересевается правилом «${entry.reseedRule}» (допустимо: ${KIND_RULES[entry.kind].join('|')})`));
  }
  if (!UNITS.includes(entry.unit)) {
    out.push(finding('closed_list', `${where}.unit`, `единица «${entry.unit}» вне закрытого списка MiB|count|null («MB» — не единица паспорта)`));
  } else if (RESEED_RULES.includes(entry.reseedRule) && RULE_UNIT[entry.reseedRule] !== entry.unit) {
    out.push(finding('kind_rule', `${where}.unit`, `правило «${entry.reseedRule}» требует единицу «${RULE_UNIT[entry.reseedRule]}», а стоит «${entry.unit}»`));
  }
  if (entry.unit === 'count') {
    const w = entry.unitWords;
    if (!(Array.isArray(w) && w.length === 3 && w.every(isStr))) {
      out.push(finding('entry_fields', `${where}.unitWords`, 'штуки нуждаются в трёх формах слова [один, два, пять] — render слов не выдумывает'));
    }
  }
  checkRegistry(entry.registry, `${where}.registry`, out);

  const values = entry.values;
  if (!isObj(values)) {
    out.push(finding('sku_complete', `${where}.values`, 'нет values по тарифам'));
    return;
  }
  for (const sku of SKU_IDS) {
    if (!(sku in values)) out.push(finding('sku_complete', `${where}.values.${sku}`, 'тарифа нет — матрица обязана быть полной'));
  }
  for (const sku of Object.keys(values)) {
    if (!SKU_IDS.includes(sku)) {
      out.push(finding('sku_complete', `${where}.values.${sku}`, `тариф вне закрытого списка ${SKU_IDS.join('|')}`));
      continue;
    }
    if (RESEED_RULES.includes(entry.reseedRule)) checkValue(entry.reseedRule, values[sku], `${where}.values.${sku}`, out);
  }
}

/**
 * Разбор resource.json. Принимает две формы: одиночную (resource/kind/values на верхнем уровне)
 * и составную (`entries[]` — несколько записей реестра в одной грануле, как у инструментов).
 * Возвращает нормализованный ресурс: `entries[]` всегда есть.
 *
 * @param {unknown} raw
 * @returns {{ok:true, resource:object} | {ok:false, findings:Array<{toothId:string, where:string, reason:string}>}}
 */
export function parseResource(raw) {
  const out = [];
  if (!isObj(raw)) return { ok: false, findings: [finding('schema', '(документ)', 'resource.json — не объект')] };
  if (raw.schema !== SCHEMA) out.push(finding('schema', 'schema', `ожидалась «${SCHEMA}», стоит «${raw.schema}»`));
  if (!isStr(raw.id)) out.push(finding('entry_fields', 'id', 'нет id гранулы ресурса'));
  if (!isStr(raw.title)) out.push(finding('entry_fields', 'title', 'нет заголовка'));
  if (!DOMAINS.includes(raw.domain)) out.push(finding('closed_list', 'domain', `домен «${raw.domain}» вне закрытого списка ${DOMAINS.join('|')}`));
  checkPassport(raw.passport, out);

  const composite = Array.isArray(raw.entries);
  if (composite && ('values' in raw || 'resource' in raw || 'kind' in raw)) {
    out.push(finding('entry_fields', '(документ)', 'либо entries[], либо одиночная форма — не обе'));
  }
  const entries = composite
    ? raw.entries.map((e) => ({ unit: null, ...e }))
    : [{
        id: raw.id,
        resource: raw.resource,
        title: raw.title,
        kind: raw.kind,
        unit: raw.unit ?? null,
        unitWords: raw.unitWords,
        reseedRule: raw.reseedRule,
        registry: raw.registry,
        values: raw.values,
      }];
  if (entries.length === 0) out.push(finding('entry_fields', 'entries', 'entries пуст'));
  const seen = new Set();
  entries.forEach((entry, i) => {
    const where = composite ? `entries[${i}]` : '(документ)';
    if (!isObj(entry)) {
      out.push(finding('entry_fields', where, 'запись — не объект'));
      return;
    }
    if (seen.has(entry.resource)) out.push(finding('entry_fields', `${where}.resource`, `ресурс «${entry.resource}» назван дважды`));
    seen.add(entry.resource);
    checkEntry(entry, where, out);
  });

  if (out.length > 0) return { ok: false, findings: out };
  return {
    ok: true,
    resource: {
      schema: raw.schema,
      id: raw.id,
      title: raw.title,
      domain: raw.domain,
      passport: raw.passport,
      systemDatasets: raw.systemDatasets,
      entries,
    },
  };
}

/** Русское слово к числу штук: 1 прибор, 4 прибора, 9 приборов. */
export function pluralRu(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Слова ячейки для человека. Слова берутся из гранулы (label/unitWords); здесь — только правило сборки. */
export function formatValue(entry, value) {
  const unratified = value.ratifiedAt === null ? ' (не закреплено)' : '';
  if (value.label) return `${value.label}${value.stub ? ' (заглушка)' : ''}${value.stub ? '' : unratified}`;
  switch (entry.reseedRule) {
    case 'exact-bytes':
      return value.MiB === 0 ? `нет${unratified}` : `${value.MiB} МиБ${unratified}`;
    case 'exact-count':
      return `${pluralRu(value.count, entry.unitWords)}${unratified}`;
    case 'catalog-id':
      return `${value.catalogId}${value.stub ? ' (заглушка)' : unratified}`;
    case 'enabled-flag':
    case 'gated-by-precondition':
    case 'produce-scope':
      return `${value.enabled ? 'да' : 'нет'}${unratified}`;
    case 'matrix-only':
      return `${value.available ? (value.outsideQuota ? 'да, вне квоты' : 'да') : 'нет'}${unratified}`;
    default:
      return '—';
  }
}

/** Одна строка markdown-таблицы «ресурс × три тарифа»; порядок колонок — rank из SKUS. Шапку даёт шаблон. */
export function renderRow(entry) {
  const cells = [...SKUS].sort((a, b) => a.rank - b.rank).map((s) => formatValue(entry, entry.values[s.sku]));
  return `| ${entry.title} | ${cells.join(' | ')} |`;
}

/** Все строки нормализованного ресурса (одна — у одиночной формы, по одной на запись — у составной). */
export function renderRows(resource) {
  return resource.entries.map(renderRow).join('\n');
}

/** Шапка таблицы — экспорт для шаблона b3 (здесь не рендерится гранулами). */
export function renderHeader() {
  const names = [...SKUS].sort((a, b) => a.rank - b.rank).map((s) => s.productName);
  return `| Ресурс | ${names.join(' | ')} |\n|---|${names.map(() => '---').join('|')}|`;
}
