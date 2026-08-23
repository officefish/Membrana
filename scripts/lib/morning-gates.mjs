/**
 * Двухгейтовое утро — предикаты (вердикт M3-G заседания angelina-hostess, 21.07).
 *
 * Ровно два стопа утра (тезис Т2 шторма #741): magistral (owner-choice из топ-3) и
 * swallow-send (одобрение доклада). send — терминальное действие: вызывается тогда и только тогда, когда
 * canSend(state, today) === true; пути мимо предикатов нет — «забыть» невозможно.
 *
 * #1233 + ADR-0024: согласие живёт в границах СВОЕГО момента субъекта — у магистрали
 * `magistralChosenAt`, у ласточки `swallow.day`; `state.day` остался дню заморозки.
 * День подаётся снаружи (детерминизм — как у ключа идемпотентности). Состояние без
 * момента или со вчерашним — гейт закрыт («протухло»). Отправитель (`telegram:swallow`)
 * зовёт `canSendAlly` и сверяет payload с `draftDigest`.
 *
 * Вечер: тот же swallow-контур (день + ack + digest); magistral — только утренний
 * статус / terminalSend. Парный вечерний файл состояния не заводим — один след.
 *
 * Чистое ядро: предикаты от состояния, без сети/Telegram/DOM.
 */

import { createHash } from 'node:crypto';

/** @returns {string} YYYY-MM-DD (UTC, как у соседних ритуальных скриптов) */
export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Digest черновика / payload — тот же текст, что уйдёт в транспорт (trim).
 * @param {string} text
 * @returns {string}
 */
export function draftDigestOf(text) {
  return createHash('sha256').update(String(text ?? '').trim()).digest('hex');
}

/**
 * Состояние «на сегодня»: `state.day` обязан совпасть с поданным днём.
 * @param {{day?: string|null}} state
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function dayFresh(state, today) {
  return Boolean(today) && state?.day === today;
}

/**
 * Момент выбора магистрали — СОБСТВЕННЫЙ, отдельный от `state.day` (ADR-0024, Р1).
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ. `state.day` обслуживал оба гейта, а у них независимые жизни: магистраль
 * выбирается однажды за день и держится, черновик ласточки переписывается и пересогласуется.
 * `swallow --draft` ставил `state.day = today` (по #1233 — «новый черновик = сегодняшний
 * след») и магистрали не касался, поэтому утро, пошедшее к черновику мимо заморозки,
 * получало сегодняшнюю дату при ВЧЕРАШНЕМ выборе: `status` докладывал ложный owner-choice,
 * а `canSend` считал предикат выполненным. Наблюдалось трижды, 05.08–07.08.
 *
 * ЛАСТОЧКА: сперва оставалась на `state.day` (поправка формы 07.08 — тот же файл читал
 * вечерний гейт, объявленный вне границ ADR), долг снят карточкой `swallow-own-moment`:
 * у неё теперь собственный момент `swallow.day` со своими фасадами ниже.
 *
 * ОТСУТСТВИЕ ПОЛЯ — НЕ «СЕГОДНЯ» (Р4). Состояние, записанное до ADR-0024, момента магистрали
 * не несёт, и он читается как НЕИЗВЕСТНЫЙ: гейт закрыт, выбор требуется заново. Наследовать
 * ему общий `state.day` значило бы воспроизвести дефект ровно в момент починки.
 *
 * @param {{magistralChosenAt?: string|null}} state
 * @returns {string|null} YYYY-MM-DD либо null, если момент неизвестен
 */
export function magistralMoment(state) {
  const at = state?.magistralChosenAt;
  return typeof at === 'string' && at.trim() ? at.trim() : null;
}

/**
 * Свеж ли СВОЙ момент магистрали (Р2: предикат сверяет тот момент, о котором утверждает).
 * @param {{magistralChosenAt?: string|null}} state
 * @param {string} today YYYY-MM-DD
 */
export function magistralMomentFresh(state, today) {
  return Boolean(today) && magistralMoment(state) === today;
}

/**
 * Поставить момент выбора магистрали.
 *
 * ПОЧЕМУ ПИСАТЕЛЬ ЖИВЁТ ЗДЕСЬ, А НЕ В CLI (разбор Ожегова 07.08). Читатель в библиотеке, а
 * писатель в скрипте — это два фасада на одну лемму, и они разойдутся на первой же правке.
 * Имя поля `magistralChosenAt` — приватный носитель леммы; вызывающий его знать не должен.
 *
 * @param {object} state мутируется на месте — состояние гейта живёт одним объектом
 * @param {string} at YYYY-MM-DD
 */
export function setMagistralMoment(state, at) {
  state.magistralChosenAt = at;
  return state;
}

/**
 * Снять момент выбора магистрали.
 *
 * Инвариант леммы, а не обязанность вызывающего (там же): «заморозка ⇒ момент сброшен»
 * не должен держаться в памяти того, кто зовёт заморозку.
 *
 * @param {object} state
 */
export function clearMagistralMoment(state) {
  state.magistralChosenAt = null;
  return state;
}

/**
 * Момент черновика ласточки — СОБСТВЕННЫЙ, отдельный от `state.day` (ADR-0024 Р1,
 * карточка-наследник `swallow-own-moment`).
 *
 * ЧЕМ БЫЛ ДОЛГ. Реализация 07.08 развела только магистраль; ласточка осталась на
 * `state.day`, потому что то же поле читал вечерний гейт. `state.day` нёс два значения —
 * «момент черновика» для утра и «день состояния» для вечера: один термин, два смысла
 * в разных домах, ровно то, что ADR-0024 запрещал (разбор Ожегова 07.08).
 *
 * ТЕПЕРЬ. Носитель момента — приватное поле `swallow.day`; оба пути ласточки (утренний
 * `morning:gate swallow` и вечерний `evening:gate partner-swallow`) пишут его через эти
 * фасады: субъект «черновик дня» один, дверей две. `state.day` остаётся дню заморозки.
 *
 * ОТСУТСТВИЕ ПОЛЯ — НЕ «СЕГОДНЯ» (Р4): состояние, записанное до миграции, момента не несёт,
 * гейт закрыт, черновик требуется заново.
 *
 * @param {{swallow?: {day?: string|null}}} state
 * @returns {string|null} YYYY-MM-DD либо null, если момент неизвестен
 */
export function swallowMoment(state) {
  const at = state?.swallow?.day;
  return typeof at === 'string' && at.trim() ? at.trim() : null;
}

/**
 * Свеж ли СВОЙ момент ласточки (Р2).
 * @param {{swallow?: {day?: string|null}}} state
 * @param {string} today YYYY-MM-DD
 */
export function swallowMomentFresh(state, today) {
  return Boolean(today) && swallowMoment(state) === today;
}

/**
 * Поставить момент черновика ласточки. Писатель живёт рядом с читателем (тот же довод,
 * что у магистрали): имя носителя приватно, CLI его не знает.
 * @param {object} state мутируется на месте
 * @param {string} at YYYY-MM-DD
 */
export function setSwallowMoment(state, at) {
  state.swallow = { ...(state.swallow ?? {}), day: at };
  return state;
}

/** Снять момент черновика ласточки. */
export function clearSwallowMoment(state) {
  if (state.swallow) state.swallow = { ...state.swallow, day: null };
  return state;
}

/**
 * Гейт magistral: выбор владельца принадлежит замороженному снимку топ-3 И день свеж.
 * Если состояние несёт `frozenDigest` — снимок сверяется с ним (P2 ревью #762).
 * @param {{day?: string|null, magistral?: {id?: string}|string|null, magistralOptions?: Array<{id: string}|string>, frozenDigest?: string|null}} state
 * @param {string} today YYYY-MM-DD (подаётся снаружи)
 * @returns {boolean}
 */
/**
 * Дайджест снимка топ-3 — тем же способом, что и при заморозке. Вынесен, потому что его
 * теперь считают трое: заморозка, проверка выбора из снимка и сторож ручной чеканки.
 *
 * @param {Array<string|{id?: string}>} options
 */
export function snapshotDigest(options) {
  const ids = (options ?? []).map((o) => (typeof o === 'string' ? o : o?.id)).filter(Boolean);
  return createHash('sha256').update(ids.join('\n')).digest('hex');
}

/**
 * Ручная чеканка магистрали владельцем — легитимна по канону утра («подписывается
 * author=human»), а прибор её не умел: `--choose` принимал только id из замороженного
 * снимка (#2083). Случай 23.08: владелец назвал магистралью вчерашнюю работу, карточки под
 * которую в реестре ещё нет; гейт закрылся, а вместе с ним встал canSend — то есть не ушёл
 * обязательный доклад партнёрам.
 *
 * ДВА ПОЛЯ, НЕ ОДНО. `magistralOptions`/`frozenDigest` — вещдок того, что предложила
 * МАШИНА; `magistral` + `magistralAuthor` — что выбрал ЧЕЛОВЕК. Обход «переморозить снимок
 * с выбором владельца внутри» запрещён билетом: получилась бы запись, будто генератор его
 * ранжировал. Поэтому ручная чеканка снимок не трогает, а фиксирует его дайджест НА МОМЕНТ
 * выбора — по нему потом видно, вписали в снимок человеческий id задним числом или нет.
 *
 * @param {object} state
 * @param {string} id идентификатор магистрали (может быть ВНЕ снимка — в этом весь смысл)
 * @param {string} today YYYY-MM-DD
 */
export function chooseMagistralManually(state, id, today) {
  const next = { ...state, magistral: id, magistralAuthor: 'human' };
  next.magistralManual = {
    at: today,
    // Снимок остаётся как есть; помним лишь его отпечаток, чтобы поймать подмену.
    snapshotDigest: snapshotDigest(state?.magistralOptions ?? []),
    inSnapshot: (state?.magistralOptions ?? [])
      .map((o) => (typeof o === 'string' ? o : o?.id))
      .includes(id),
  };
  return setMagistralMoment(next, today);
}

/**
 * Сторож ручной чеканки: снимок не подменён после человеческого выбора.
 *
 * Красное — ровно тот обход, который запрещает #2083: человеческий id дописали в
 * `magistralOptions` (и, возможно, пересчитали `frozenDigest`, чтобы «сошлось»). Тогда
 * запись утверждала бы, что машина ранжировала выбор владельца, — ложь в вещдоке.
 *
 * @param {object} state
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function manualChoiceIntact(state) {
  const manual = state?.magistralManual;
  if (!manual) return { ok: true };
  const options = (state?.magistralOptions ?? []).map((o) => (typeof o === 'string' ? o : o?.id));
  const chosen = typeof state?.magistral === 'string' ? state.magistral : state?.magistral?.id;
  if (!manual.inSnapshot && chosen && options.includes(chosen)) {
    return {
      ok: false,
      reason: `человеческий выбор «${chosen}» вписан В снимок машины — снимок обязан остаться вещдоком генератора (#2083)`,
    };
  }
  const now = snapshotDigest(state?.magistralOptions ?? []);
  if (manual.snapshotDigest && now !== manual.snapshotDigest) {
    return {
      ok: false,
      reason: `снимок изменился после ручной чеканки (было ${String(manual.snapshotDigest).slice(0, 8)}, стало ${now.slice(0, 8)}) — вещдок генератора подменён`,
    };
  }
  return { ok: true };
}

export function magistralChosen(state, today) {
  // Р2 ADR-0024: сверяем СВОЙ момент, а не общий `state.day`. Прежняя строка звала
  // `dayFresh(state, today)` — и потому чужой шаг (`swallow --draft`) делал вчерашний
  // выбор сегодняшним.
  if (!magistralMomentFresh(state, today)) return false;
  const chosen = typeof state?.magistral === 'string' ? state.magistral : state?.magistral?.id;
  if (!chosen) return false;
  // Ручная чеканка (#2083): канон её разрешает, значит предикат обязан её признавать —
  // иначе canSend стоит и обязательный доклад партнёрам не уходит. Снимок при этом не
  // проверяется на вхождение (id законно ВНЕ него), но проверяется на НЕПОДМЕНУ.
  if (state?.magistralAuthor === 'human') return manualChoiceIntact(state).ok;
  const options = (state?.magistralOptions ?? []).map((o) => (typeof o === 'string' ? o : o?.id));
  if (state?.frozenDigest) {
    const actual = createHash('sha256').update(options.join('\n')).digest('hex');
    if (actual !== state.frozenDigest) return false; // снимок подменён — гейт закрыт
  }
  return options.includes(chosen);
}

/**
 * Гейт swallow-send: явное «ок» владельца на сегодняшний зафиксированный черновик.
 * @param {{day?: string|null, swallow?: {ownerAck?: boolean, draftDigest?: string|null}}} state
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function swallowApproved(state, today) {
  // Р2 ADR-0024 (долг swallow-own-moment снят): сверяется СВОЙ момент ласточки,
  // не общий `state.day` — тот остался дню заморозки.
  if (!swallowMomentFresh(state, today)) return false;
  return state?.swallow?.ownerAck === true && Boolean(state?.swallow?.draftDigest);
}

/**
 * Отправляемый текст = тот, на который дали «ок».
 * @param {{swallow?: {draftDigest?: string|null}}} state
 * @param {string} payload
 * @returns {boolean}
 */
export function payloadMatchesDraft(state, payload) {
  const expected = state?.swallow?.draftDigest;
  if (!expected) return false;
  return draftDigestOf(payload) === expected;
}

/**
 * Утренний путь к отправке: день ∧ magistral ∧ swallow. Причины блока — для Ангелины.
 * @param {object} state
 * @param {string} today YYYY-MM-DD
 * @returns {{ok: boolean, blockedBy: string[]}}
 */
export function canSend(state, today) {
  // Р2 ADR-0024: общего раннего выхода по `state.day` больше нет — каждый сомножитель
  // проверяет СВОЙ момент и называет собственную причину. Прежний ранний выход по общему
  // дню скрывал, КОТОРЫЙ из двух гейтов протух, и заодно давал магистрали чужую свежесть.
  const blockedBy = [];
  const mMoment = magistralMoment(state);
  if (!magistralMomentFresh(state, today)) {
    blockedBy.push(
      mMoment
        ? `magistral: выбор не сегодняшний (сделан ${mMoment}) — нужен owner-choice сегодня`
        : 'magistral: момент выбора неизвестен — нужен freeze + owner-choice сегодня',
    );
  } else if (!magistralChosen(state, today)) {
    blockedBy.push('magistral: ждёт owner-choice из топ-3');
  }
  const sMoment = swallowMoment(state);
  if (!swallowMomentFresh(state, today)) {
    blockedBy.push(
      sMoment
        ? `swallow-send: черновик не сегодняшний (зафиксирован ${sMoment}) — нужен свежий draft + «ок»`
        : 'swallow-send: момент черновика неизвестен — нужен свежий draft + «ок»',
    );
  } else if (!swallowApproved(state, today)) {
    blockedBy.push('swallow-send: ждёт явного «ок» владельца по черновику');
  }
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Путь отправителя (`telegram:swallow`): день ∧ swallow ∧ digest payload.
 * Magistral не требуется — вечерняя ласточка ходит тем же контуром без утреннего выбора.
 * @param {object} state
 * @param {string} today YYYY-MM-DD
 * @param {string} payload текст, который уйдёт в транспорт
 * @returns {{ok: boolean, blockedBy: string[]}}
 */
export function canSendAlly(state, today, payload) {
  const blockedBy = [];
  // Р2 ADR-0024: отправитель сверяет момент ЛАСТОЧКИ — субъект «черновик дня» один
  // у утренней и вечерней двери, и согласие живёт в его границах, не в дне заморозки.
  if (!swallowMomentFresh(state, today)) {
    blockedBy.push('swallow-send: момент черновика не сегодняшний — согласие не на сегодня');
  } else if (!(state?.swallow?.ownerAck === true && Boolean(state?.swallow?.draftDigest))) {
    blockedBy.push('swallow-send: ждёт явного «ок» владельца по черновику');
  } else if (!payloadMatchesDraft(state, payload)) {
    blockedBy.push('digest: отправляемый текст ≠ зафиксированному черновику (yarn morning:gate swallow --draft …)');
  }
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Ключ идемпотентности отправки: по содержимому И ДНЮ утра (не по попытке доставки).
 * @param {string} payload
 * @param {string} dayOfMorning YYYY-MM-DD (подаётся снаружи — детерминизм)
 * @returns {string}
 */
export function sendIdempotencyKey(payload, dayOfMorning) {
  return createHash('sha256').update(`${dayOfMorning}\n${String(payload ?? '')}`).digest('hex');
}

/**
 * Заморозка снимка топ-3 на сессию (M3-G: выбор не устаревает от пересчёта).
 * @param {Array<{id: string}>} topThree
 * @param {string} [today] день снимка; по умолчанию сегодня
 * @returns {{day: string, magistralOptions: string[], frozenDigest: string}}
 */
export function freezeTopThree(topThree, today = todayIso()) {
  const ids = (topThree ?? []).map((t) => (typeof t === 'string' ? t : t?.id)).filter(Boolean);
  const patch = {
    day: today,
    magistralOptions: ids,
    frozenDigest: createHash('sha256').update(ids.join('\n')).digest('hex'),
  };
  // Р3 ADR-0024: заморозка снимает ВЫБОР магистрали, значит снимает и его момент —
  // через лемму, а не прямым присваиванием: инвариант принадлежит ей, не вызывающему.
  return clearMagistralMoment(patch);
}

/**
 * Терминальный send-раннер: единственная обёртка morning-пути. Эффект инъектируется;
 * при блоке — НЕ вызывается. Повтор с тем же ключом — no-op.
 * @param {object} state
 * @param {string} payload
 * @param {string} dayOfMorning
 * @param {{transport: (payload: string) => Promise<unknown>, sentKeys?: Set<string>}} io
 * @returns {Promise<{sent: boolean, key: string|null, blockedBy: string[], duplicate?: boolean}>}
 */
export async function terminalSend(state, payload, dayOfMorning, io) {
  const gate = canSend(state, dayOfMorning);
  if (!gate.ok) return { sent: false, key: null, blockedBy: gate.blockedBy };
  if (!payloadMatchesDraft(state, payload)) {
    return {
      sent: false,
      key: null,
      blockedBy: ['digest: отправляемый текст ≠ зафиксированному черновику'],
    };
  }
  const key = sendIdempotencyKey(payload, dayOfMorning);
  if (io?.sentKeys?.has(key)) return { sent: false, key, blockedBy: [], duplicate: true };
  await io.transport(payload);
  io?.sentKeys?.add(key);
  return { sent: true, key, blockedBy: [] };
}
