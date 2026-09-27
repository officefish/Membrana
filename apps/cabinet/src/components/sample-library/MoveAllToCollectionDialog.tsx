/**
 * Окно «перенести все» — выбор набора, план, подтверждение (заказ владельца 27.09).
 *
 * ЗАЧЕМ ОКНО, А НЕ ПРОСТО КНОПКА. Перенос пачкой упирается в место: хранилище наборов
 * мембраны — такая же ось квоты, как буфер, и на тарифе «Датчик» такая же по объёму.
 * Значит «перенести все» из полного буфера в общем случае НЕ помещается целиком, и человек
 * обязан узнать это ДО, а не по факту. Поэтому шаг плана (`dryRun`) обязателен: дверь
 * считает, сколько поместится, окно называет живые числа, и только потом — слово человека.
 *
 * ПРО ДОЛЮ. Владелец 27.09: «70% — это просто пример, выдуманная пропорция для
 * наглядности». Доля здесь нигде не задана числом и не считается: окно называет ЖИВЫЕ
 * числа плана («перенесётся 740 из 1057 · 341 МБ»). Константа доли соврала бы при первом же
 * другом буфере, а процент от настоящих чисел ничего к ним не добавляет.
 *
 * ПРО ЧТО ПРЕДУПРЕЖДЕНИЕ. Замер по `devices.service.ts:254-263`: пробы набора `kind ===
 * 'buffer'` считаются осью `buffer`, пробы `kind === 'user'` — осью `userStorage`. ЁМКОСТИ У
 * НАБОРА НЕТ. Перенос переливает байты из одной оси квоты в другую и упирается в
 * `userStorage` мембраны. Значит честная формулировка — «не вмещает хранилище мембраны», а
 * НЕ «набор полон»: второе назвало бы виновным то, у чего и предела-то нет, и человек пошёл
 * бы чистить набор.
 *
 * ВОРОТА МЯГЧЕ, ЧЕМ У УДАЛЕНИЯ, И ЭТО НАМЕРЕННО. Перенос обратим: проба цела, у неё
 * меняется набор. Пугать его окном вещдоков (`DeletionConfirmDialog`, галочка «понимаю,
 * что удаляю») значило бы уравнять обратимое с необратимым — а от предупреждения, которое
 * пугает всем одинаково, перестают читать все предупреждения.
 *
 * ПОЧЕМУ СЛОВА ЖИВУТ ЗДЕСЬ, А НЕ В ПАКЕТЕ. Первая редакция держала их ядром в
 * `@membrana/media-library-service`. Арбитраж ведущей 27.09 по шву #2488/#2489: слой
 * доступа к двери приезжает серверной половиной, и вторая рука в том же пакете уже дала два
 * несовместимых объявления одного метода. Поэтому в пакет отсюда не добавляется НИЧЕГО —
 * оттуда только типы двери, а слова и машина шагов живут в носителе окна. Цена названа:
 * копий текста две, по одной на дом.
 *
 * БЛИЗНЕЦ. Тот же файл по смыслу живёт в Studio
 * (`apps/client/src/components/MoveAllToCollectionDialog.tsx`). Общего UI-пакета у домов
 * нет, поэтому правило одно, а носителя два; побайтное совпадение тел — не добрая воля,
 * его держит зуб сходства
 * `apps/client/src/modules/move-all-dialog-twins.test.ts`, а не внимательность.
 */
import { useCallback, useEffect, useId, useReducer, useRef, type ReactNode } from 'react';

import {
  BUFFER_COLLECTION_ID,
  type Collection,
  type MoveBatchOutcome,
  type MoveBatchPlan,
  type MoveBatchStay,
  type MoveBatchStayReason,
} from '@membrana/media-library-service';

/**
 * Порт окна: чем оно перечисляет пробы набора и чем зовёт дверь.
 *
 * Дверь может быть ещё не влита — окно строится против ЭТОГО, а не против `fetch`, и зубы
 * ходят подставным портом: дом тоже видит только порт. Подпись `run` ПОЗИЦИОННАЯ, ровно как
 * у глагола слоя доступа (`moveSamplesBatch(sampleIds, toCollectionId, options)`, арбитраж
 * 27.09): своя форма заказа-объектом была бы третьим контрактом на одном шву.
 */
export interface MoveAllPort {
  /** Все пробы исходного набора — ПОЛНЫЙ перечень, не загруженная страница. */
  readonly enumerate: () => Promise<readonly string[]>;
  readonly run: (
    sampleIds: readonly string[],
    toCollectionId: string,
    options?: { readonly dryRun?: boolean },
  ) => Promise<MoveBatchOutcome>;
}

/** Слова причины — человеку на экран, а не в лог. */
export const MOVE_ALL_STAY_REASON_TITLE: Record<MoveBatchStayReason, string> = {
  'no-space': 'не хватило места в хранилище',
  'not-found': 'проба не найдена',
  /**
   * Одно слово на ТРИ случая. Причина ставится дверью по одному признаку — `row.inBuffer ===
   * false` (`packages/background-media/src/modules/samples/move-batch-plan.ts`), и под него
   * попадают: проба тарифного набора, которой в буфере и не было; проба, ушедшая из буфера
   * между планом и применением (единственная форма гонки, видимая окну); и ЛЮБАЯ проба, когда
   * источником выбран не буфер, а свой набор человека — кнопка «перенести все» к буферу не
   * привязана (#2249), а дверь вывозит пачкой ТОЛЬКО из буфера.
   *
   * Прежнее «пробы нет в исходном наборе» на третьем случае врало прямо: проба лежит ровно в
   * том наборе, который человек назвал источником, и остаётся она не поэтому. Говорим то, что
   * дверь на самом деле проверила.
   */
  'not-in-buffer': 'проба не в буфере прибора',
};

/** Сколько проб остаётся по этой причине. */
function countStayReason(stayed: readonly MoveBatchStay[], reason: MoveBatchStayReason): number {
  return stayed.filter((s) => s.reason === reason).length;
}

/**
 * «не хватило места в хранилище — 271; проба не в буфере прибора — 3» — счёт по КАЖДОЙ причине.
 *
 * Одна сборка на план и на итог: до подтверждения и после человек читает одни и те же слова о
 * тех же причинах, иначе два места складывали бы один перечень двумя способами.
 */
function stayReasonsLine(stayed: readonly MoveBatchStay[]): string {
  const byReason = new Map<MoveBatchStayReason, number>();
  for (const s of stayed) byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  return [...byReason.entries()]
    .map(([reason, count]) => `${MOVE_ALL_STAY_REASON_TITLE[reason]} — ${count}`)
    .join('; ');
}

/** Откуда едут пробы: имя для слов и признак буфера — у буфера свои слова об остатке. */
export interface MoveAllSource {
  readonly name: string;
  readonly isBuffer: boolean;
}

/**
 * Куда разрешено переносить: буфер адресатом не бывает (перенос в буфер — это не перенос),
 * системный набор только для чтения, текущий набор сам себе адресатом не бывает.
 */
export function moveAllTargets(
  collections: readonly Collection[],
  fromCollectionId: string,
): readonly Collection[] {
  return collections.filter(
    (c) => c.id !== fromCollectionId && c.id !== BUFFER_COLLECTION_ID && c.kind === 'user',
  );
}

/** «341 МБ» — те же единицы, что у соседей по смыслу (`buffer-stop`, `deletion-value`). */
export function formatMoveAllBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'н/д';
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1048576).toFixed(1)} МБ`;
  return `${(bytes / 1073741824).toFixed(2)} ГБ`;
}

/** «1 проба», «2 пробы», «317 проб» — согласование, а не «проб(а)». */
export function pluralSamples(count: number): string {
  const n = Math.abs(Math.trunc(count)) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return `${count} проб`;
  if (last === 1) return `${count} проба`;
  if (last >= 2 && last <= 4) return `${count} пробы`;
  return `${count} проб`;
}

function stayPlace(source: MoveAllSource): string {
  return source.isBuffer ? 'в буфере' : `в наборе «${source.name}»`;
}

/**
 * Обе оси квоты одной строкой — состояние на КОНЕЦ вызова, прямо из ответа двери (уточнение
 * 27.09). За квотой второй раз не ходим: второй запрос дал бы третью версию правды.
 */
export function moveAllAxesLine(outcome: MoveBatchOutcome): string {
  return (
    `Хранилище наборов: занято ${formatMoveAllBytes(outcome.userStorage.usedBytes)} из ` +
    `${formatMoveAllBytes(outcome.userStorage.limitBytes)} · буфер: ` +
    `${formatMoveAllBytes(outcome.buffer.usedBytes)} из ${formatMoveAllBytes(outcome.buffer.limitBytes)} · ` +
    `дверь принимает до ${outcome.maxBatch} проб за вызов`
  );
}

export interface MoveAllPlanWords {
  /** Главная строка плана — живые числа, без процентов. */
  readonly headline: string;
  /** Предупреждение о нехватке места. `null`, когда помещается ВСЁ. */
  readonly warning: string | null;
  /** План судит не о том, что заказали. `null`, когда числа сходятся. */
  readonly requestedMismatch: string | null;
}

/**
 * Слова плана до подтверждения.
 *
 * Предупреждение появляется ТОЛЬКО при `willStay > 0` — предупреждение «на всякий случай»
 * перестают читать целиком, и тогда оно не работает там, где нужно.
 */
export function describeMoveAllPlan(input: {
  readonly plan: MoveBatchPlan;
  readonly requested: number;
  readonly source: MoveAllSource;
  readonly userStorage: { readonly usedBytes: number; readonly limitBytes: number };
  /**
   * Кто и почему остаётся по плану. ОБЯЗАТЕЛЕН, а не «по возможности»: без причин слова умеют
   * сказать только «не влезло», а это неправда в двух случаях из трёх (см. виновника ниже).
   * Необязательное поле здесь и было щелью — забыть его значило молча вернуться ко лжи.
   */
  readonly stayed: readonly MoveBatchStay[];
}): MoveAllPlanWords {
  const { plan, requested, source, userStorage, stayed } = input;
  const judged = plan.willMove + plan.willStay;
  const headline = `Перенесётся ${plan.willMove} из ${judged} · ${formatMoveAllBytes(plan.moveBytes)}`;

  /**
   * Веса ненайденных проб дверь не знает (уточнение 27.09), и в `stayBytes` их нет, а в
   * `willStay` они есть счётом. Молча показать оба числа рядом — значит выдать неполные
   * мегабайты за полные. Называем оговорку, а не подгоняем числа.
   *
   * Числительное здесь без существительного намеренно: «без 2 пробы» — падеж, который
   * согласование по одному правилу не вытягивает, а кривая грамматика в предупреждении
   * читается как небрежность, и предупреждению перестают верить целиком.
   */
  const unweighed = countStayReason(stayed, 'not-found');
  const bytesCaveat =
    unweighed > 0 ? ` (мегабайты неполны: веса ненайденных проб дверь не знает, их ${unweighed})` : '';

  /**
   * ВИНОВНИК НАЗЫВАЕТСЯ ПО ПРИЧИНАМ, А НЕ ПО ОДНОМУ `willStay > 0`.
   *
   * `willStay` считает ВСЕХ остающихся, а места не хватило только тем, у кого причина
   * `no-space`. Безусловное «места не хватает в хранилище мембраны, освободите место или
   * смените тариф» врёт ровно тем же способом, каким врало бы «набор полон»: называет виновным
   * не то, что отказало. Живой случай этой лжи — источником выбран свой набор, а не буфер:
   * дверь отдаёт `not-in-buffer` на ВСЁ, места при этом сколько угодно, а окно посылало
   * человека чистить хранилище или менять тариф.
   */
  const noSpace = countStayReason(stayed, 'no-space');
  const blame =
    noSpace > 0
      ? 'Дело не в наборе: ёмкости у набора нет, места не хватает в хранилище мембраны — занято ' +
        `${formatMoveAllBytes(userStorage.usedBytes)} из ${formatMoveAllBytes(userStorage.limitBytes)}. ` +
        'Освободите место или смените тариф и повторите перенос — остаток цел.'
      : stayed.length > 0
        ? 'Места в хранилище мембраны хватает — дело не в нём. Пачкой дверь вывозит только из ' +
          'буфера прибора; остальное переносите по одной пробе.'
        : 'Причин дверь не назвала — о месте по одному числу остатка судить нельзя.';

  const warning =
    plan.willStay > 0
      ? `Перенесётся не всё: ${plan.willMove} из ${judged} · ${formatMoveAllBytes(plan.moveBytes)}, ` +
        `остальное останется ${stayPlace(source)} — ${pluralSamples(plan.willStay)} · ${formatMoveAllBytes(plan.stayBytes)}${bytesCaveat}. ` +
        (stayed.length > 0 ? `Почему остаётся: ${stayReasonsLine(stayed)}. ` : '') +
        blame
      : null;

  const requestedMismatch =
    judged === requested
      ? null
      : `Заказано ${pluralSamples(requested)}, а план посчитан по ${judged}: показываем то, что посчитала дверь, а не то, что просили.`;

  return { headline, warning, requestedMismatch };
}

export interface MoveAllResultWords {
  /** Что произошло НА САМОМ ДЕЛЕ — по `moved`, а не по плану. */
  readonly headline: string;
  /** Кто остался и почему, с числами по каждой причине. `null` — не осталось никого. */
  readonly stayed: string | null;
  /** Факт разошёлся с планом. `null` — сошлись. */
  readonly planMismatch: string | null;
  /** Свежие оси квоты словами — состояние на конец вызова, прямо из ответа двери. */
  readonly axes: string;
}

/**
 * Слова после прогона.
 *
 * ПЛАН — НЕ ФАКТ, и итог считается по `moved`, а не по `plan`. Дверь обещает (уточнение
 * 27.09), что при НАСТОЯЩЕМ прогоне `plan` описывает исход, а `moved` сверен перечитыванием
 * из базы, то есть числа обязаны совпасть. Сравнение оставлено именно поэтому: это сторож
 * обещания, а не ожидаемая дорога. Сломается обещание — человек увидит оба числа, а не
 * успокаивающее одно; пропуск «в свою пользу» в этом деле уже стоил дорого (#2237).
 */
export function describeMoveAllOutcome(input: {
  readonly outcome: MoveBatchOutcome;
  readonly requested: number;
  readonly source: MoveAllSource;
}): MoveAllResultWords {
  const { outcome, requested, source } = input;
  const headline = `Перенесено ${outcome.moved.length} из ${requested}`;

  const stayed =
    outcome.stayed.length > 0
      ? `Останется ${stayPlace(source)} ${pluralSamples(outcome.stayed.length)} · ${stayReasonsLine(outcome.stayed)}.`
      : null;

  const planMismatch =
    outcome.moved.length === outcome.plan.willMove
      ? null
      : `План обещал ${outcome.plan.willMove}, перенеслось ${outcome.moved.length}: показанное было планом, а не фактом.`;

  return { headline, stayed, planMismatch, axes: moveAllAxesLine(outcome) };
}

/**
 * МАШИНА ШАГОВ ОКНА — отдельно от вёрстки и без `useState`.
 *
 * Тот же приём, что у ворот удаления (`deletionGateReducer`, #2232): состояние объявляется
 * событиями, потому что в доме оно переживает закрытие (компонент не размонтируется) и
 * второй перенос открылся бы с планом первого — то есть человек подтвердил бы числа,
 * которых больше нет. Здесь состояние сбрасывается объявленным `close`, а не надеждой.
 */
export type MoveAllPhase =
  | { readonly kind: 'choose' }
  | { readonly kind: 'planning'; readonly toCollectionId: string }
  | {
      readonly kind: 'planned';
      readonly toCollectionId: string;
      readonly sampleIds: readonly string[];
      readonly outcome: MoveBatchOutcome;
    }
  | { readonly kind: 'moving'; readonly toCollectionId: string; readonly sampleIds: readonly string[] }
  | {
      readonly kind: 'done';
      readonly toCollectionId: string;
      readonly requested: number;
      readonly outcome: MoveBatchOutcome;
    }
  | { readonly kind: 'failed'; readonly why: string };

export interface MoveAllState {
  readonly phase: MoveAllPhase;
  /** Набор-адресат, выбранный человеком. Живёт отдельно от шага: шаг сменился — выбор остался. */
  readonly toCollectionId: string;
}

export const MOVE_ALL_START: MoveAllState = { phase: { kind: 'choose' }, toCollectionId: '' };

export type MoveAllEvent =
  | { readonly type: 'close' }
  | { readonly type: 'choose'; readonly toCollectionId: string }
  | { readonly type: 'plan-start' }
  | { readonly type: 'plan-done'; readonly sampleIds: readonly string[]; readonly outcome: MoveBatchOutcome }
  | { readonly type: 'move-start' }
  | { readonly type: 'move-done'; readonly outcome: MoveBatchOutcome }
  | { readonly type: 'failed'; readonly why: string };

export function moveAllReducer(state: MoveAllState, event: MoveAllEvent): MoveAllState {
  switch (event.type) {
    case 'close':
      return MOVE_ALL_START;
    case 'choose':
      // Сменил адресата — прежний план недействителен: он считался для другого набора.
      return { phase: { kind: 'choose' }, toCollectionId: event.toCollectionId };
    case 'plan-start':
      if (!state.toCollectionId) return state;
      return { ...state, phase: { kind: 'planning', toCollectionId: state.toCollectionId } };
    case 'plan-done':
      if (state.phase.kind !== 'planning') return state;
      return {
        ...state,
        phase: {
          kind: 'planned',
          toCollectionId: state.phase.toCollectionId,
          sampleIds: event.sampleIds,
          outcome: event.outcome,
        },
      };
    case 'move-start':
      // Переносить можно ТОЛЬКО из показанного плана: без него нет ни списка, ни слова.
      if (state.phase.kind !== 'planned') return state;
      return {
        ...state,
        phase: {
          kind: 'moving',
          toCollectionId: state.phase.toCollectionId,
          sampleIds: state.phase.sampleIds,
        },
      };
    case 'move-done':
      if (state.phase.kind !== 'moving') return state;
      return {
        ...state,
        phase: {
          kind: 'done',
          toCollectionId: state.phase.toCollectionId,
          requested: state.phase.sampleIds.length,
          outcome: event.outcome,
        },
      };
    case 'failed':
      return { ...state, phase: { kind: 'failed', why: event.why } };
    default:
      return state;
  }
}

/** Органы окна, которые СЕЙЧАС берут фокус. Погашенные (`disabled`) не берут — и не считаются. */
const FOCUSABLE_IN_DIALOG =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function focusablesOf(node: HTMLElement | null): readonly HTMLElement[] {
  return Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE_IN_DIALOG) ?? []);
}

/**
 * Первый орган окна под фокус, а если органов нет — САМО окно (`tabIndex={-1}` у него для этого).
 * Оставить фокус снаружи значило бы открыть модальное окно, не забрав к нему человека.
 */
function focusInsideDialog(node: HTMLElement | null): void {
  if (!node) return;
  (focusablesOf(node)[0] ?? node).focus();
}

export interface MoveAllToCollectionDialogProps {
  readonly open: boolean;
  /** Откуда едут пробы: имя для слов и признак буфера — у буфера свои слова об остатке. */
  readonly source: MoveAllSource;
  /**
   * Сколько проб в наборе по счётчику НАБОРА, а не по загруженной странице. Число стоит в
   * окне до плана; страница кабинета держит 40 из 1057, и показать её было бы занижением.
   */
  readonly sourceTotal: number;
  /** Все наборы узла. Кого из них можно выбрать — решает `moveAllTargets`, а не дом. */
  readonly collections: readonly Collection[];
  readonly sourceCollectionId: string;
  readonly port: MoveAllPort;
  readonly onClose: () => void;
  /** Перенос состоялся — дому пора перечитать свою страницу проб. */
  readonly onMoved?: () => void;
}

export function MoveAllToCollectionDialog({
  open,
  source,
  sourceTotal,
  collections,
  sourceCollectionId,
  port,
  onClose,
  onMoved,
}: MoveAllToCollectionDialogProps): ReactNode {
  const [state, dispatch] = useReducer(moveAllReducer, MOVE_ALL_START);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();
  /**
   * Поколение открытия. Ответ двери, приехавший после закрытия окна, в ЭТО окно не попадёт:
   * иначе человек, открывший перенос второй раз, увидел бы план первого — и подтвердил бы
   * числа, которых уже нет.
   */
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    dispatch({ type: 'close' });
  }, [open]);

  const phase = state.phase;
  const busy = phase.kind === 'planning' || phase.kind === 'moving';

  /**
   * ЗАХВАТ И ВОЗВРАТ ФОКУСА — по ОДНОМУ открытию, а не по каждой смене занятости.
   *
   * Образец — окно остановки буфера (`OverflowWindow.tsx`) — держит захват, возврат и
   * клавиатуру одним эффектом с `busy` в зависимостях, и там это безвредно: занятость ему
   * приносит дом снаружи. Здесь `busy` меняет САМО окно (план → перенос → итог), и на каждой
   * смене чистка того же эффекта возвращала бы фокус НАРУЖУ — кнопке, которая окно открыла.
   * Поэтому захват и возврат зависят только от `open`, а клавиатура живёт отдельным эффектом.
   */
  useEffect(() => {
    if (!open) return undefined;
    returnFocusTo.current = document.activeElement;
    focusInsideDialog(dialogRef.current);
    return () => {
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus();
    };
  }, [open]);

  /** Клавиатура: Esc закрывает (пока не идёт работа), Tab не выпускает из окна. */
  useEffect(() => {
    if (!open) return undefined;
    const node = dialogRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busy) onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusablesOf(node);
      /**
       * ОРГАНОВ НЕТ — НЕ КРАЙ, А ШТАТНЫЙ ШАГ: пока идёт работа, окно гасит ВСЕ свои органы
       * (закрытие, отмена, выбор набора, кнопка плана — каждый `disabled`). Прежнее `return`
       * на пустом перечне означало, что ровно в эти секунды Tab уводил человека на страницу
       * ПОД модальным окном. Уводить некуда: фокус едет на само окно.
       */
      if (list.length === 0) {
        e.preventDefault();
        node?.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onClose]);

  const targets = moveAllTargets(collections, sourceCollectionId);

  const askPlan = useCallback(async () => {
    const mine = generation.current;
    dispatch({ type: 'plan-start' });
    try {
      const sampleIds = await port.enumerate();
      if (sampleIds.length === 0) {
        if (generation.current === mine) {
          dispatch({ type: 'failed', why: 'В наборе нет проб — переносить нечего.' });
        }
        return;
      }
      const outcome = await port.run(sampleIds, state.toCollectionId, { dryRun: true });
      if (generation.current === mine) dispatch({ type: 'plan-done', sampleIds, outcome });
    } catch (e) {
      if (generation.current === mine) {
        dispatch({ type: 'failed', why: e instanceof Error ? e.message : String(e) });
      }
    }
  }, [port, state.toCollectionId]);

  const runMove = useCallback(
    async (sampleIds: readonly string[], toCollectionId: string) => {
      const mine = generation.current;
      dispatch({ type: 'move-start' });
      try {
        // Переносим РОВНО тот список, по которому считался показанный план: пересчитать
        // перечень здесь значило бы подтвердить одно, а сделать другое.
        const outcome = await port.run(sampleIds, toCollectionId, { dryRun: false });
        if (generation.current === mine) dispatch({ type: 'move-done', outcome });
        onMoved?.();
      } catch (e) {
        if (generation.current === mine) {
          dispatch({ type: 'failed', why: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    [onMoved, port],
  );

  if (!open) return null;

  const targetName = targets.find((c) => c.id === state.toCollectionId)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" data-testid="move-all-window">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        /* Пристанище фокуса на те секунды, когда окно занято и все его органы погашены. */
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-auto rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold">
              Перенести все в набор
            </h3>
            <p id={descId} className="text-sm text-base-content/70">
              Источник — {source.isBuffer ? 'буфер' : `набор «${source.name}»`}: {pluralSamples(sourceTotal)}. Пробы
              не удаляются, у них меняется набор.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Закрыть окно переноса"
            onClick={onClose}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {targets.length === 0 ? (
          <p className="alert alert-info py-2 text-sm" role="status" data-testid="move-all-no-targets">
            Переносить некуда: своих наборов ещё нет. Создайте набор — буфер адресатом не бывает.
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">Набор, в который переносим</span>
            <select
              className="select select-bordered select-sm"
              value={state.toCollectionId}
              disabled={busy}
              data-testid="move-all-target"
              onChange={(e) => dispatch({ type: 'choose', toCollectionId: e.target.value })}
            >
              <option value="" disabled>
                Выберите набор…
              </option>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {phase.kind === 'planning' ? (
          <p className="text-sm" role="status" data-testid="move-all-planning">
            Считаем, сколько поместится…
          </p>
        ) : null}

        {phase.kind === 'planned'
          ? (() => {
              const words = describeMoveAllPlan({
                plan: phase.outcome.plan,
                requested: phase.sampleIds.length,
                source,
                userStorage: phase.outcome.userStorage,
                // Причины остатка нужны словам: в мегабайтах остатка НЕТ проб, которых дверь
                // не нашла (уточнение 27.09), и оговорку об этом произносят слова, не дом.
                stayed: phase.outcome.stayed,
              });
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium tabular-nums" data-testid="move-all-plan">
                    {words.headline}
                  </p>
                  {/*
                    ПЛАШКА НЕХВАТКИ МЕСТА — только при `willStay > 0` (слова отдают `null`, когда
                    помещается всё). Предупреждение «на всякий случай» перестают читать целиком.

                    Классы: сплошная семантическая поверхность `alert alert-warning`. Своего цвета
                    текста здесь НЕ ставим: `-content` подобран под сплошную заливку, и на
                    полупрозрачной (`bg-warning/10`) он пропадает в четырёх тёмных темах из пяти —
                    зуб `apps/client/src/lib/semanticSurfaceContrast.test.ts`, случай #2461.
                  */}
                  {words.warning !== null ? (
                    <p className="alert alert-warning py-2 text-sm" role="status" data-testid="move-all-warning">
                      {words.warning}
                    </p>
                  ) : null}
                  {words.requestedMismatch !== null ? (
                    <p className="text-xs text-error" role="alert" data-testid="move-all-plan-mismatch">
                      {words.requestedMismatch}
                    </p>
                  ) : null}
                  <p className="text-xs text-base-content/60 tabular-nums" data-testid="move-all-axes">
                    {moveAllAxesLine(phase.outcome)}
                  </p>
                </div>
              );
            })()
          : null}

        {phase.kind === 'moving' ? (
          <p className="text-sm" role="status" data-testid="move-all-moving">
            Переносим в «{targetName}»…
          </p>
        ) : null}

        {phase.kind === 'done'
          ? (() => {
              const words = describeMoveAllOutcome({
                outcome: phase.outcome,
                requested: phase.requested,
                source,
              });
              return (
                <div className="flex flex-col gap-2">
                  <p className="alert alert-success py-2 text-sm tabular-nums" role="status" data-testid="move-all-result">
                    {words.headline}
                  </p>
                  {words.stayed !== null ? (
                    <p className="text-sm" data-testid="move-all-result-stayed">
                      {words.stayed}
                    </p>
                  ) : null}
                  {/*
                    Факт разошёлся с планом — говорим оба числа, а не показываем план как итог.
                    Дверь обещает, что при настоящем прогоне они совпадают; это сторож обещания.
                  */}
                  {words.planMismatch !== null ? (
                    <p className="alert alert-warning py-2 text-sm" role="alert" data-testid="move-all-result-mismatch">
                      {words.planMismatch}
                    </p>
                  ) : null}
                  {/* Свежие оси — из того же ответа: за квотой второй раз не ходим. */}
                  <p className="text-xs text-base-content/60 tabular-nums" data-testid="move-all-result-axes">
                    {words.axes}
                  </p>
                </div>
              );
            })()
          : null}

        {phase.kind === 'failed' ? (
          <p className="alert alert-error py-2 text-sm" role="alert" data-testid="move-all-failed">
            {phase.why}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {phase.kind === 'done' ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
              Закрыть
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>
                Отмена
              </button>
              {phase.kind === 'planned' ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-testid="move-all-confirm"
                  /*
                    ПО ПЛАНУ НЕ ЕДЕТ НИ ОДНА — подтверждать нечего, и орган погашен. Живая
                    дорога сюда есть: источником выбран свой набор, а не буфер (кнопка к
                    буферу не привязана, #2249), и дверь отдаёт `not-in-buffer` на всё.
                    Действующая кнопка «Перенести 0» обещала бы движение и отправляла бы
                    дверь возить пустоту; почему не едет — сказано плашкой выше.
                  */
                  disabled={phase.outcome.plan.willMove === 0}
                  onClick={() => void runMove(phase.sampleIds, phase.toCollectionId)}
                >
                  Перенести {phase.outcome.plan.willMove} в «{targetName}»
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-testid="move-all-plan-request"
                  disabled={busy || !state.toCollectionId}
                  onClick={() => void askPlan()}
                >
                  Показать, сколько поместится
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
