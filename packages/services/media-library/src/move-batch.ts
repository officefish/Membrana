/**
 * Перенос ПАЧКОЙ буфер→набор — ядро, одно на оба дома (заказ владельца 27.09).
 *
 * ЗАЧЕМ ЯДРО, А НЕ ДВА ОКНА. Библиотека проб живёт дважды (Studio и кабинет), общего
 * UI-пакета у домов нет. Слова, которые человек прочтёт перед необратимым по объёму
 * действием, обязаны быть ОДНИ: две копии одной фразы однажды разойдутся на слово, и
 * разойдутся именно на том, которое человек читает как обещание (класс #2250,
 * `SELECT_ALL_SHOWN_LABEL`). Поэтому здесь и числа, и фразы, и машина шагов; дома рисуют.
 *
 * ПРО ЧТО ПРЕДУПРЕЖДЕНИЕ. Замер ведущей по `devices.service.ts:254-263`: пробы набора
 * `kind === 'buffer'` считаются осью `buffer`, пробы `kind === 'user'` — осью `userStorage`.
 * ЁМКОСТИ У НАБОРА НЕТ. Перенос переливает байты из одной оси квоты в другую, и упирается
 * он в `userStorage` мембраны (на тарифе «Датчик» — те же 512 МБ, что и буфер). Значит
 * честная формулировка — «не вмещает хранилище мембраны», а НЕ «набор полон»: второе
 * назвало бы виновным то, у чего и предела-то нет, и человек пошёл бы чистить набор.
 *
 * ПРО ДОЛЮ. Владелец 27.09: «70% — это просто пример, выдуманная пропорция для
 * наглядности». Доля здесь нигде не задана числом и не считается: окно называет ЖИВЫЕ
 * числа плана («перенесётся 740 из 1057 · 341 МБ»). Процент от настоящих чисел ничего не
 * добавляет, а константа доли соврала бы при первом же другом буфере.
 */
import { BUFFER_COLLECTION_ID } from './constants.js';
import type { Collection } from './types.js';

/** Почему проба осталась. Закрытый список — ровно контракт двери media. */
export type MoveBatchStayReason = 'no-space' | 'not-found' | 'not-in-buffer';

/** Слова причины — человеку на экран, а не в лог. Одни на оба дома. */
export const MOVE_BATCH_STAY_REASON_TITLE: Record<MoveBatchStayReason, string> = {
  'no-space': 'не хватило места в хранилище',
  'not-found': 'проба не найдена',
  'not-in-buffer': 'проба уже не в исходном наборе',
};

export interface MoveBatchStay {
  readonly sampleId: string;
  readonly reason: MoveBatchStayReason;
}

/** План двери: что уедет и что останется — в пробах и в байтах. */
export interface MoveBatchPlan {
  readonly willMove: number;
  readonly willStay: number;
  readonly moveBytes: number;
  readonly stayBytes: number;
}

/** Ось квоты, как её отдаёт дверь. */
export interface MoveBatchAxis {
  readonly usedBytes: number;
  readonly limitBytes: number;
}

/** Заказ двери `POST /v1/devices/:deviceId/samples/move-batch`. */
export interface MoveBatchRequest {
  readonly sampleIds: readonly string[];
  readonly toCollectionId: string;
  readonly dryRun?: boolean;
}

/** Исход двери. При `dryRun` `moved` пуст, а `plan` уже посчитан — это и есть «показать до». */
export interface MoveBatchOutcome {
  readonly plan: MoveBatchPlan;
  readonly moved: readonly string[];
  readonly stayed: readonly MoveBatchStay[];
  readonly userStorage: MoveBatchAxis;
  readonly buffer: MoveBatchAxis;
}

/**
 * Порт окна: чем оно перечисляет пробы набора и чем зовёт дверь.
 *
 * Дверь может быть ещё не влита — окно строится против ЭТОГО, а не против `fetch`. Зубы
 * ходят подставным портом, и это не эмуляция ради теста: дом тоже видит только порт.
 */
export interface MoveBatchPort {
  /** Все пробы исходного набора — ПОЛНЫЙ перечень, не загруженная страница. */
  readonly enumerate: () => Promise<readonly string[]>;
  readonly run: (request: MoveBatchRequest) => Promise<MoveBatchOutcome>;
}

/**
 * Куда разрешено переносить. Правило одно и живёт здесь, а не в двух домах: буфер в
 * выборе адресата не участвует (перенос в буфер — это не перенос), системный набор только
 * для чтения, и текущий набор сам себе адресатом не бывает.
 */
export function moveBatchTargets(
  collections: readonly Collection[],
  fromCollectionId: string,
): readonly Collection[] {
  return collections.filter(
    (c) => c.id !== fromCollectionId && c.id !== BUFFER_COLLECTION_ID && c.kind === 'user',
  );
}

/** «341 МБ» — те же единицы, что у соседей по пакету (`buffer-stop`, `deletion-value`). */
export function formatMoveBatchBytes(bytes: number): string {
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

/** Откуда едут пробы: имя для слов и признак буфера — у буфера свои слова. */
export interface MoveBatchSource {
  readonly name: string;
  readonly isBuffer: boolean;
}

function stayPlace(source: MoveBatchSource): string {
  return source.isBuffer ? 'в буфере' : `в наборе «${source.name}»`;
}

export interface MoveBatchPlanWords {
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
export function describeMoveBatchPlan(input: {
  readonly plan: MoveBatchPlan;
  readonly requested: number;
  readonly source: MoveBatchSource;
  readonly userStorage: MoveBatchAxis;
}): MoveBatchPlanWords {
  const { plan, requested, source, userStorage } = input;
  const judged = plan.willMove + plan.willStay;
  const headline = `Перенесётся ${plan.willMove} из ${judged} · ${formatMoveBatchBytes(plan.moveBytes)}`;

  const warning =
    plan.willStay > 0
      ? `Не всё поместится: перенесётся ${plan.willMove} из ${judged} · ${formatMoveBatchBytes(plan.moveBytes)}, ` +
        `остальное останется ${stayPlace(source)} — ${pluralSamples(plan.willStay)} · ${formatMoveBatchBytes(plan.stayBytes)}. ` +
        'Дело не в наборе: ёмкости у набора нет, места не хватает в хранилище мембраны — занято ' +
        `${formatMoveBatchBytes(userStorage.usedBytes)} из ${formatMoveBatchBytes(userStorage.limitBytes)}. ` +
        'Освободите место или смените тариф и повторите перенос — остаток цел.'
      : null;

  const requestedMismatch =
    judged === requested
      ? null
      : `Заказано ${pluralSamples(requested)}, а план посчитан по ${judged}: показываем то, что посчитала дверь, а не то, что просили.`;

  return { headline, warning, requestedMismatch };
}

export interface MoveBatchResultWords {
  /** Что произошло НА САМОМ ДЕЛЕ — по `moved`, а не по плану. */
  readonly headline: string;
  /** Кто остался и почему, с числами по каждой причине. `null` — не осталось никого. */
  readonly stayed: string | null;
  /** Факт разошёлся с планом. `null` — сошлись. */
  readonly planMismatch: string | null;
}

/**
 * Слова после прогона.
 *
 * ПЛАН — НЕ ФАКТ. `moved.length` может разойтись с `plan.willMove`: между показом и словом
 * человека прибор мог дописать буфер, а место могло уйти. Показать план как итог — это тот
 * самый «молчаливый пропуск в успокаивающую сторону», за который в этом пакете уже платили
 * (#2237). Разошлось — говорим оба числа.
 */
export function describeMoveBatchOutcome(input: {
  readonly outcome: MoveBatchOutcome;
  readonly requested: number;
  readonly source: MoveBatchSource;
}): MoveBatchResultWords {
  const { outcome, requested, source } = input;
  const headline = `Перенесено ${outcome.moved.length} из ${requested}`;

  const byReason = new Map<MoveBatchStayReason, number>();
  for (const s of outcome.stayed) {
    byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  }
  const reasons = [...byReason.entries()]
    .map(([reason, count]) => `${MOVE_BATCH_STAY_REASON_TITLE[reason]} — ${count}`)
    .join('; ');
  const stayed =
    outcome.stayed.length > 0
      ? `Останется ${stayPlace(source)} ${pluralSamples(outcome.stayed.length)} · ${reasons}.`
      : null;

  const planMismatch =
    outcome.moved.length === outcome.plan.willMove
      ? null
      : `План обещал ${outcome.plan.willMove}, перенеслось ${outcome.moved.length}: показанное было планом, а не фактом.`;

  return { headline, stayed, planMismatch };
}

/**
 * МАШИНА ШАГОВ ОКНА — в ядре, а не в двух домах.
 *
 * Тот же приём, что у ворот удаления (`deletionGateReducer`, #2232): состояние окна
 * хранится ядром, потому что в доме оно переживает закрытие (компонент не размонтируется)
 * и второй перенос открылся бы с планом первого — то есть человек подтвердил бы числа,
 * которых больше нет. Здесь состояние сбрасывается объявленным `close`, а не надеждой.
 */
export type MoveBatchPhase =
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

export interface MoveBatchState {
  readonly phase: MoveBatchPhase;
  /** Набор-адресат, выбранный человеком. Живёт отдельно от шага: шаг сменился — выбор остался. */
  readonly toCollectionId: string;
}

export const MOVE_BATCH_START: MoveBatchState = { phase: { kind: 'choose' }, toCollectionId: '' };

export type MoveBatchEvent =
  | { readonly type: 'close' }
  | { readonly type: 'choose'; readonly toCollectionId: string }
  | { readonly type: 'plan-start' }
  | { readonly type: 'plan-done'; readonly sampleIds: readonly string[]; readonly outcome: MoveBatchOutcome }
  | { readonly type: 'move-start' }
  | { readonly type: 'move-done'; readonly outcome: MoveBatchOutcome }
  | { readonly type: 'failed'; readonly why: string };

export function moveBatchReducer(state: MoveBatchState, event: MoveBatchEvent): MoveBatchState {
  switch (event.type) {
    case 'close':
      return MOVE_BATCH_START;
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
