/**
 * truth-graph — чистое ядро графа правды (эпик #576, консилиум truth-graph-unify-or-split).
 *
 * DAG: узлы — токены реестра `docs/truth/registry.json`, рёбра — `derived-from`
 * (`parents`). Ядро БЕЗ fs/git/сети: всё внешнее приходит аргументами. Обвязка —
 * `scripts/truth.mjs`.
 *
 * Повод: 16.07 ритуал дважды за день вынес ложный вердикт, не зная одной строчки
 * («FREE отгружена 15.07»). Разбор — docs/seanses/main-day-issue-drift-report-2026-07-16.md.
 *
 * Правило №1 канона (INSIGHT.md): не хранить правду — хранить, как её перепроверить.
 * Поэтому доказательство токена — команда (`predicates[].cmd`), а не ответ.
 *
 * Границы (консилиум truth-graph-q1-adr-or-registry): ADR — ОТДЕЛЬНЫЙ реестр, сюда не
 * втягивается. Признак — мутабельность жизненного цикла: ADR иммутабелен после принятия
 * (`mutations ∈ {0,1}`), токен изменяем (`≈3–5`: чеканка → верификация → отзыв).
 */

/** @typedef {{id:string, claim:string, class:'owner'|'derived', parents:string[], status:string, revocation?:object, source?:object, predicates?:{id:string,cmd:string,verified?:string,originHash?:string}[], probe?:object}} Token */
/** @typedef {{id:string, severity:'error'|'warn', rule:string, message:string}} Violation */

/**
 * Индексирует реестр в граф. Чистая функция: на вход — разобранный JSON.
 *
 * @param {{tokens?: Token[]}} registry
 */
export function buildGraph(registry) {
  const tokens = registry?.tokens ?? [];
  /** @type {Map<string, Token>} */
  const byId = new Map();
  for (const t of tokens) byId.set(t.id, t);

  /** Кто ссылается на меня (обратные рёбра) — нужен для радиуса поражения. */
  /** @type {Map<string, string[]>} */
  const children = new Map();
  for (const t of tokens) {
    for (const p of t.parents ?? []) {
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(t.id);
    }
  }

  /**
   * Предикаты резолвятся ГЛОБАЛЬНО: предикат — не собственность токена, а факт о коде.
   * Один и тот же `client-dist-carries-palette` используют три токена; объявлен он там,
   * где впервые доказан. Требовать локального объявления значило бы дублировать команду
   * и развести даты `verified` — то есть хранить ответ вместо способа перепроверки
   * (правило №1). Найдено прогоном ядра на живом реестре 17.07.
   */
  /** @type {Map<string, object>} */
  const predicates = new Map();
  for (const t of tokens) {
    for (const p of t.predicates ?? []) {
      if (!predicates.has(p.id)) predicates.set(p.id, { ...p, declaredBy: t.id });
    }
  }

  return { tokens, byId, children, predicates };
}

/**
 * Предикаты, которыми токен пользуется (из `premisesUsed`), — резолвленные глобально.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {Token} t
 */
export function usedPredicates(graph, t) {
  const used = (t.source?.premisesUsed ?? [])
    .filter((u) => String(u).startsWith('predicate:'))
    .map((u) => String(u).slice('predicate:'.length));
  return used.map((id) => ({ id, def: graph.predicates.get(id) ?? null }));
}

/**
 * I1 — ацикличность. Токен, выведенный (пусть и через цепочку) из самого себя,
 * доказывает сам себя: круг в основании.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {Violation[]}
 */
export function checkAcyclic(graph) {
  /** @type {Violation[]} */
  const out = [];
  const state = new Map(); // id → 'visiting' | 'done'
  const stack = [];

  const visit = (id) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      const at = stack.indexOf(id);
      const cycle = [...stack.slice(at), id].join(' → ');
      out.push({ id, severity: 'error', rule: 'I1', message: `цикл: ${cycle}` });
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    for (const p of graph.byId.get(id)?.parents ?? []) {
      if (graph.byId.has(p)) visit(p);
    }
    stack.pop();
    state.set(id, 'done');
  };

  for (const t of graph.tokens) visit(t.id);
  return dedupeViolations(out);
}

/**
 * I2 — существование узла. Висячий `parent` = токен-призрак: правило отзыва указывает
 * в пустоту, каскад его не достанет. Тот же дефект, что 16.07 нашли у карточки
 * detector-metrics-characterization (promptPath в несуществующий файл, #565).
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {Violation[]}
 */
export function checkParentsExist(graph) {
  /** @type {Violation[]} */
  const out = [];
  for (const t of graph.tokens) {
    for (const p of t.parents ?? []) {
      if (!graph.byId.has(p)) {
        out.push({ id: t.id, severity: 'error', rule: 'I2', message: `висячий parent: ${p}` });
      }
    }
  }
  return out;
}

/**
 * I3 — ложная посылка ⇒ derived сломан. Выведенный токен наследует смерть родителя:
 * `parents` и есть его правило отзыва (канон: вес не снижается, умирает с любым родителем).
 *
 * Отдельно ловим контрабанду и лишнюю посылку — зеркальные ошибки:
 * спрятанная посылка лжёт о ВЫВОДЕ, лишняя лжёт об ОТЗЫВЕ (токен умрёт от смерти
 * родителя, к которому не имеет отношения). `premisesUsed` — полный список; всё, что
 * не предикат (`predicate:` префикс), обязано быть в `parents`, и наоборот.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {(t: Token) => boolean} [isBroken] — извне: считается ли токен сломанным
 * @returns {Violation[]}
 */
export function checkDerivedIntegrity(graph, isBroken = (t) => t.status === 'revoked' || t.status === 'broken') {
  /** @type {Violation[]} */
  const out = [];
  for (const t of graph.tokens) {
    if (t.class !== 'derived') continue;

    for (const p of t.parents ?? []) {
      const parent = graph.byId.get(p);
      if (parent && isBroken(parent) && !isBroken(t)) {
        out.push({
          id: t.id,
          severity: 'error',
          rule: 'I3',
          message: `родитель ${p} сломан (${parent.status}), а токен всё ещё ${t.status}`,
        });
      }
    }

    const used = t.source?.premisesUsed;
    if (!used) continue;
    const usedTokens = used.filter((u) => !String(u).startsWith('predicate:'));
    const usedPredicates = used
      .filter((u) => String(u).startsWith('predicate:'))
      .map((u) => String(u).slice('predicate:'.length));
    const parents = t.parents ?? [];

    for (const u of usedTokens) {
      if (!parents.includes(u)) {
        out.push({ id: t.id, severity: 'error', rule: 'I3', message: `КОНТРАБАНДА: посылка ${u} использована, но не в parents` });
      }
    }
    for (const p of parents) {
      if (!usedTokens.includes(p)) {
        out.push({ id: t.id, severity: 'error', rule: 'I3', message: `ЛИШНЯЯ ПОСЫЛКА: parent ${p} не участвует в выводе — ложное правило отзыва` });
      }
    }
    // Предикат резолвится глобально: объявлен там, где впервые доказан, используется многими.
    for (const u of usedPredicates) {
      const def = graph.predicates.get(u);
      if (!def) {
        out.push({ id: t.id, severity: 'error', rule: 'I3', message: `предикат ${u} использован, но не объявлен нигде в реестре` });
      } else if (!def.cmd) {
        out.push({ id: t.id, severity: 'error', rule: 'I3', message: `предикат ${u} без команды — хранит ответ, а не способ перепроверки` });
      }
    }
    for (const d of (t.predicates ?? []).map((p) => p.id)) {
      const usedAnywhere = graph.tokens.some((x) =>
        (x.source?.premisesUsed ?? []).includes(`predicate:${d}`),
      );
      if (!usedAnywhere) {
        out.push({ id: t.id, severity: 'warn', rule: 'I3', message: `ДЕКОРАЦИЯ: предикат ${d} объявлен, но не используется ни одним токеном` });
      }
    }
  }
  return out;
}

/**
 * I4 — декоррелированность посылок (вклад Музыканта, консилиум 17.07).
 *
 * Две посылки, стоящие на одном `originHash`, — ОДНО свидетельство, а не два.
 * Прямой урок 16.07: таблица «Почему это магистраль» показывала три «независимых
 * источника», которые оказались одним снимком от 06.07, отражённым трижды. Без этого
 * инварианта граф посчитает эхо за консенсус ровно так же.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {string} tokenId
 * @returns {number} число НЕЗАВИСИМЫХ свидетельств (общий origin-hash схлопывается в одно)
 */
export function independentPremises(graph, tokenId) {
  const t = graph.byId.get(tokenId);
  if (!t) return 0;
  const origins = new Set();
  for (const p of t.parents ?? []) {
    const parent = graph.byId.get(p);
    if (!parent) continue;
    origins.add(originOf(parent) ?? `token:${p}`);
  }
  for (const pred of t.predicates ?? []) {
    origins.add(pred.origin ? `hash:${originHash(pred.origin)}` : `pred:${pred.id}`);
  }
  return origins.size;
}

/**
 * Стабильный дешёвый идентификатор первоисточника. FNV-1a, НЕ криптографический:
 * нужен стабильный ключ происхождения, а не защита от подделки.
 *
 * ПЕРЕЕХАЛ СЮДА из `scripts/lib/main-day-probe.mjs` (#538, дедуп эхо-камеры) при
 * рефакторе 17.07: агент написал в ядре вторую реализацию эхо-детекции, не грепнув
 * репозиторий — ровно то, за что эпик #576 и ругает проект («обе половины построены и
 * не соединены»). Направление зависимости по решению консилиума: пробник на ядро, не
 * наоборот. В `main-day-probe.mjs` оставлен ре-экспорт — импортёры не задеты.
 *
 * @param {string} origin первоисточник, напр. 'detection-planning-priorities.mjs@2026-07-06'
 * @returns {string} 7-символьный short-hash
 */
export function originHash(origin) {
  const text = String(origin ?? '').trim();
  if (text === '') return '0000000';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}

/**
 * Схлопнуть свидетельства с общим первоисточником: три отражения одного снимка —
 * ОДИН голос, а не три. Порядок сохраняется, первое вхождение выигрывает.
 *
 * @param {readonly {origin?: string}[]} evidence
 */
export function dedupeByOrigin(evidence) {
  /** @type {Map<string, any>} */
  const byOrigin = new Map();
  for (const item of evidence ?? []) {
    const hash = originHash(item?.origin);
    const seen = byOrigin.get(hash);
    if (seen) {
      seen.reflections += 1;
      continue;
    }
    byOrigin.set(hash, { ...item, originHash: hash, reflections: 1 });
  }
  return [...byOrigin.values()];
}

/** Сколько НЕЗАВИСИМЫХ первоисточников — различных, а не строк. */
export function countIndependentSources(evidence) {
  return dedupeByOrigin(evidence).length;
}

/**
 * Происхождение токена: хеш ВЫЧИСЛЯЕТСЯ из человекочитаемого `source.origin`, а не
 * хранится готовым. Правило №1: не хранить ответ — хранить, как его получить. Хранимый
 * хеш нечитаем в diff и разъедется с origin при первой же правке.
 *
 * Токен без `origin` — самостоятельное свидетельство (его первоисточник сам владелец).
 *
 * @param {Token} t
 */
export function originOf(t) {
  const o = t.source?.origin ?? t.predicates?.[0]?.origin;
  return o ? `hash:${originHash(o)}` : null;
}

/**
 * I4-нарушение: derived заявляет N посылок, но независимых меньше — эхо выдано за
 * консенсус.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {Violation[]}
 */
export function checkDecorrelation(graph) {
  /** @type {Violation[]} */
  const out = [];
  for (const t of graph.tokens) {
    if (t.class !== 'derived') continue;
    const declared = (t.parents?.length ?? 0) + (t.predicates?.length ?? 0);
    if (declared < 2) continue;
    const independent = independentPremises(graph, t.id);
    if (independent < declared) {
      out.push({
        id: t.id,
        severity: 'warn',
        rule: 'I4',
        message: `ЭХО: заявлено ${declared} посылок, независимых ${independent} — общий источник`,
      });
    }
  }
  return out;
}

/**
 * Чем подкреплён токен. Владельческий факт невыводим предикатом — его доказательство
 * это УКАЗАТЕЛЬ на волеизъявление (`source.utterance`: sessionId + uuid), а не копия
 * цитаты: копию можно сочинить, указатель — нет (в транскрипте реплика либо есть, либо
 * нет). Правило №1 в применении к слову владельца: храним не текст, а способ достать.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {Token} t
 * @returns {'utterance'|'predicate'|'probe'|null}
 */
export function evidenceKind(graph, t) {
  if (t.source?.utterance?.sessionId && t.source?.utterance?.uuid) return 'utterance';
  if (usedPredicates(graph, t).length > 0) return 'predicate';
  if (t.probe) return 'probe';
  return null;
}

/**
 * Человекочитаемая метка доказательства — ДЛЯ ДИСПЛЕЯ, но живёт рядом с `evidenceKind`
 * и меряет им же.
 *
 * ПОЧЕМУ ЗДЕСЬ, А НЕ В `truth.mjs`. 17.07 метка считалась в колонке таблицы отдельно и
 * знала только про `predicates`/`probe` — про указатели на волеизъявление не знала вовсе.
 * Итог: `truth:verify` в ОДНОМ выводе утверждал две несовместимые вещи — гейт I7 молчал
 * (доказательство видит), а таблица про те же 13 из 14 владельческих токенов печатала
 * «доказательства нет». Два места считали одно и то же и разъехались — эхо-механизм,
 * против которого реестр и заведён. Лечится не подгонкой второго места под первое, а
 * устранением второго.
 *
 * Порядок ветвей — ровно порядок `evidenceKind`; ветка чистой дедукции достижима только
 * когда `evidenceKind` вернул null, то есть у токена НЕТ ни предиката, ни пробы. Поэтому
 * `parents.length` там равен фактическому числу посылок, а не занижает его.
 *
 * @returns {string}
 */
export function evidenceLabel(graph, t) {
  const kind = evidenceKind(graph, t);
  if (kind === 'utterance') {
    const at = t.source?.utterance?.timestamp?.slice(0, 10) ?? t.source?.date ?? '?';
    // Клик по вариантам агента слабее свободного текста: пространство выбора было
    // агентское (17.07 — morning_crystallization помечала клики так же). Различие
    // живёт в ядре, чтобы дисплей и гейт мерили одним.
    const weak = t.source?.utterance?.kind === 'click' ? ' — слабее: варианты агентские' : '';
    return `указатель на реплику @${at}${weak}`;
  }
  if (kind === 'predicate') {
    const preds = usedPredicates(graph, t);
    return `команда ×${preds.length} @${preds[0]?.def?.verified ?? '?'}`;
  }
  if (kind === 'probe') return `проба @${t.probe?.verified ?? '?'}`;
  // Чистая дедукция: доказательство — сами посылки, они уже в колонке «держится на».
  // Писать про такой токен «доказательства нет» — та же ложь дисплея, только для
  // выведенного класса.
  if (t.class === 'derived' && t.parents?.length) return `дедукция из ${t.parents.length} посыл(ок)`;
  return 'ТОЛЬКО ДАТА — доказательства нет';
}

/**
 * I7 — владельческий токен без указателя на волеизъявление: держится на ДАТЕ, то есть
 * на справке «владелец что-то сказал» без того, что он сказал.
 *
 * WARN, не error (решение владельца 17.07: протухшее и слабое не блокируют поток, а
 * копятся в очередь ревизии). Но обязано быть видимым: 17.07 обнаружено, что 6 из 7
 * владельческих токенов подкреплены только датой — асимметрия, из-за которой срез
 * модальности в `scenario-truth-source-by-class` был невидим до очной ставки с подлинником.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {Violation[]}
 */
export function checkOwnerEvidence(graph) {
  /** @type {Violation[]} */
  const out = [];
  for (const t of graph.tokens) {
    if (t.class !== 'owner' || t.status !== 'active') continue;
    if (evidenceKind(graph, t) === null) {
      out.push({ id: t.id, severity: 'warn', rule: 'I7', message: 'владельческий токен без указателя на волеизъявление — держится на дате, а не на слове' });
    }
  }
  return out;
}

/**
 * I6 — предикат обязан объявить, НА ЧЁМ он стоит (`touches`).
 *
 * Без этого поля `computeStale` его молча пропускает: предикат никогда не протухнет,
 * то есть станет молчаливым бессрочным «истина» — запрещено правилом №2 канона.
 * Найдено 17.07 прогоном `truth verify` на живом реестре: он отрапортовал «протухших: 0»,
 * потому что ни один из трёх предикатов не объявлял `touches`. Ложный зелёный ровно того
 * же рода, что `main-day-probe` без манифеста (exit 0) и drift-якоря со снимком 13.07
 * («ok 8»): инструмент промолчал, молчание прочли как отсутствие проблемы.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {Violation[]}
 */
export function checkPredicateDecay(graph) {
  /** @type {Violation[]} */
  const out = [];
  for (const [id, pred] of graph.predicates) {
    if (!pred.touches || pred.touches.length === 0) {
      out.push({
        id: pred.declaredBy ?? id,
        severity: 'error',
        rule: 'I6',
        message: `предикат ${id} без touches — не может протухнуть, значит бессрочная «истина» (правило №2)`,
      });
    }
    if (!pred.verified) {
      out.push({ id: pred.declaredBy ?? id, severity: 'error', rule: 'I6', message: `предикат ${id} без verified — свежесть невычислима` });
    }
  }
  return out;
}

/**
 * I5 — подписчик ссылается на существующий токен. Слабая связанность: граф не знает
 * потребителей, но битая ссылка подписчика значит, что процесс охлаждается по призраку —
 * то есть не охлаждается вовсе, и молча.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {{subscribers?: {process:string, reads?:string[], onBreak?:string}[]}} manifest
 * @returns {Violation[]}
 */
export function checkSubscribers(graph, manifest) {
  /** @type {Violation[]} */
  const out = [];
  for (const s of manifest?.subscribers ?? []) {
    for (const id of s.reads ?? []) {
      if (!graph.byId.has(id)) {
        out.push({ id: s.process, severity: 'error', rule: 'I5', message: `читает несуществующий токен ${id} — охлаждается по призраку` });
      }
    }
    if (s.onBreak !== 'block' && s.onBreak !== 'warn') {
      out.push({ id: s.process, severity: 'error', rule: 'I5', message: `onBreak должен быть block|warn, получено «${s.onBreak}»` });
    }
  }
  return out;
}

/**
 * Кого роняет сломанный/протухший токен: подписчики с `onBreak: block`, читающие его
 * напрямую ИЛИ через потомка (радиус поражения).
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {{subscribers?: {process:string, reads?:string[], onBreak?:string}[]}} manifest
 * @param {string[]} brokenIds
 */
export function affectedSubscribers(graph, manifest, brokenIds) {
  const hit = new Set(brokenIds);
  for (const id of brokenIds) for (const c of radiusOfBreak(graph, id)) hit.add(c);

  /** @type {{process:string, onBreak:string, via:string[]}[]} */
  const out = [];
  for (const s of manifest?.subscribers ?? []) {
    const via = (s.reads ?? []).filter((id) => hit.has(id));
    if (via.length > 0) out.push({ process: s.process, onBreak: s.onBreak ?? 'warn', via });
  }
  return out;
}

/**
 * Все инварианты разом. `error` роняет гейт, `warn` — нет.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {object} [manifest] — подписчики; без него I5 не проверяется
 * @returns {Violation[]}
 */
export function checkInvariants(graph, manifest = null) {
  return [
    ...checkParentsExist(graph),
    ...checkAcyclic(graph),
    ...checkDerivedIntegrity(graph),
    ...checkDecorrelation(graph),
    ...checkPredicateDecay(graph),
    ...checkOwnerEvidence(graph),
    ...(manifest ? checkSubscribers(graph, manifest) : []),
  ];
}

/**
 * Свежесть по ГИТ-ФАКТУ, не по mtime (решение консилиума).
 *
 * `isHot(token) = ∃ commit c: c.touches(origin) ∧ c.merged_at > verifiedAt`.
 * Тронули то, на чём факт стоит, после его проверки → факт горячий → `stale`.
 * Это hash-привязка, а не TTL: срок годности задаёт СБОРКА, а не календарь
 * (ресёрч Q1: TTL для фактов в проде умер, заменён версионированием).
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {(originPath: string) => string | null} lastTouchedAt — извне (git log -1 --format=%cI -- <path>)
 * @returns {{id:string, reason:string}[]}
 */
export function computeStale(graph, lastTouchedAt) {
  /** @type {{id:string, reason:string}[]} */
  const out = [];

  /** Какие предикаты протухли — считаем один раз на предикат, не на токен. */
  /** @type {Map<string, string>} */
  const hotPredicates = new Map();
  for (const [id, pred] of graph.predicates) {
    if (!pred.verified || !pred.touches) continue;
    for (const path of pred.touches) {
      const touched = lastTouchedAt(path);
      if (touched && isAfter(touched, pred.verified)) {
        hotPredicates.set(id, `${path} тронут ${touched.slice(0, 10)} после проверки ${pred.verified}`);
        break;
      }
    }
  }

  // Протухание бьёт по ВСЕМ, кто предикатом пользуется, а не только по объявившему:
  // иначе двое соседей останутся «свежими» на протухшем основании (найдено 17.07).
  for (const t of graph.tokens) {
    if (t.status !== 'active') continue;
    for (const { id } of usedPredicates(graph, t)) {
      const reason = hotPredicates.get(id);
      if (reason) out.push({ id: t.id, reason: `предикат ${id}: ${reason}` });
    }
  }
  return dedupeById(out);
}

/**
 * Радиус поражения: кого утащит отзыв токена. Обход вниз по обратным рёбрам.
 * Владелец видит цену решения ДО того, как передумал.
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {string} tokenId
 * @returns {string[]} id всех достижимых потомков (без самого токена)
 */
export function radiusOfBreak(graph, tokenId) {
  const seen = new Set();
  const queue = [...(graph.children.get(tokenId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of graph.children.get(id) ?? []) queue.push(c);
  }
  return [...seen];
}

/**
 * Строго ли `touched` позже `verified` — СРАВНЕНИЕ ПО ДАТЕ, не строковое.
 *
 * `verified` в реестре — дата (`2026-07-17`), git отдаёт datetime
 * (`2026-07-17T05:00:00+03:00`). Строковое `>` даёт ложное «протух» на всём, что
 * тронуто в день проверки: `'2026-07-17T05:00…' > '2026-07-17'` === true, хотя проверка
 * могла быть в 08:00, после правки. Найдено 17.07 при прогоне на живом реестре — не
 * выстрелило лишь потому, что все основания оказались старше недели.
 *
 * Сравниваем календарные дни: тронули в день проверки → считаем свежим (проверка
 * последняя по смыслу — агент проверял после того, как правил).
 *
 * @param {string} touched ISO datetime из git
 * @param {string} verified дата (YYYY-MM-DD) или ISO
 */
export function isAfter(touched, verified) {
  return String(touched).slice(0, 10) > String(verified).slice(0, 10);
}

/** @param {Violation[]} v */
function dedupeViolations(v) {
  const seen = new Set();
  return v.filter((x) => {
    const k = `${x.rule}|${x.id}|${x.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** @param {{id:string, reason:string}[]} v */
function dedupeById(v) {
  const seen = new Set();
  return v.filter((x) => {
    const k = `${x.id}|${x.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Есть ли хоть одно нарушение уровня error. */
export function hasError(violations) {
  return violations.some((v) => v.severity === 'error');
}
