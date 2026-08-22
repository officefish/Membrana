/**
 * Исполнитель чарт-листа — АДАПТЕР функционала отбора к интерфейсу журнала. Блок c3.
 *
 * Т1 шторма 22.08: плагин есть интерфейс обособленного функционала к КОНКРЕТНОМУ модулю. Отсюда
 * разделение обязанностей в этом файле:
 *   • отбор     — `selection.ts`, ничего не знает ни про журнал, ни про плагины;
 *   • измерение — `session-metrics`, идёт там, где блоб лежит локально;
 *   • здесь     — только перевод: настройки человека → задание отбору, результат → ответ дому.
 *
 * ЗВУКА ЗДЕСЬ НЕТ. Кандидаты приезжают УЖЕ ИЗМЕРЕННЫМИ через порт `measure`. Порт, а не служба:
 * исполнителю незачем знать, кто и как добыл звук, — по варианту A это делает media, где блоб
 * локален, но подмена порта в зубе не должна требовать поднятого media.
 *
 * РУЧКИ ЧЕЛОВЕКА ЕДУТ В `ctx.payload` И В `configHash` НЕ ВХОДЯТ.
 * Следствие названо Дыниным и Родченко независимо и принято сознательно: два прогона с разными
 * настройками неразличимы по отпечатку и расходятся только `runId`. Здесь это НЕ «чинится»:
 * расширение `configHash` было бы переоткрытием вердикта M3′, а не мелким улучшением. Отпечатки
 * исполнитель вообще не трогает — он их получает готовыми в `ctx.fingerprints`, потому что
 * считает их тот, кто заказывает прогон (см. `journal-run-address.ts` в доме журнала).
 */
import type { PluginContext, PluginExecutor, RunResult } from '@membrana/plugin-contracts';

import {
  CHART_LIST_DEFAULTS,
  isChartListCriterion,
  isChartListVolume,
  selectChartList,
  type ChartListCandidate,
  type ChartListSelection,
  type ChartListTuning,
} from './selection.js';

/** Задание отбору: адреса записей ленты. Проверено домом ДО вызова — здесь второй суд не нужен. */
export interface ChartListTask {
  readonly userId: string;
  readonly entryIds: readonly string[];
}

/**
 * Порт измерения. Отдаёт измеренных кандидатов по адресам записей.
 *
 * Возврат МЕНЬШЕГО числа кандидатов, чем адресов в задании, — законный исход, а не ошибка: у части
 * записей может не оказаться звука (род `report`), и молча дополнять список пустышками значило бы
 * подсунуть отбору тишину вместо звука.
 */
export interface ChartListMeasurePort {
  measure(task: ChartListTask): Promise<readonly ChartListCandidate[]>;
}

export interface ChartListDeps {
  readonly port: ChartListMeasurePort;
  readonly tuning?: ChartListTuning;
}

/** Настройки человека, как они приезжают в `ctx.payload`. */
export interface ChartListSettings {
  readonly volume: number;
  readonly criterion: string;
}

export interface ChartListResult extends RunResult {
  readonly kind: 'showcase';
  readonly selection: ChartListSelection;
  /** Сколько адресов было в задании и сколько из них удалось измерить — расхождение видно. */
  readonly asked: number;
  readonly measured: number;
}

/**
 * Прочитать настройки из полезной нагрузки.
 *
 * Негодные значения НЕ подставляются молча: они едут в отбор как есть, и отбор отвечает отказом с
 * названной причиной. Тихая подстановка «ну возьмём 20» скрыла бы от человека, что его выбор не
 * дошёл, — а он вправе знать, что смотрит не на то, что заказывал.
 */
export function settingsOf(payload: unknown): ChartListSettings {
  const p = (payload ?? {}) as Record<string, unknown>;
  const volume = typeof p.volume === 'number' ? p.volume : Number.NaN;
  const criterion = typeof p.criterion === 'string' ? p.criterion : '';
  return { volume, criterion };
}

/** Годны ли настройки — спрашивается ДО измерения: мерить двести треков ради отказа незачем. */
export function settingsUsable(s: ChartListSettings): boolean {
  return isChartListVolume(s.volume) && isChartListCriterion(s.criterion);
}

export function createChartListExecutor(deps: ChartListDeps): PluginExecutor & {
  runWithTask(ctx: PluginContext, task: ChartListTask): Promise<ChartListResult>;
} {
  const tuning = deps.tuning ?? CHART_LIST_DEFAULTS;

  async function runWithTask(ctx: PluginContext, task: ChartListTask): Promise<ChartListResult> {
    const settings = settingsOf(ctx.payload);

    // Негодные настройки — отказ БЕЗ измерения. Порядок несущий: измерение двухсот треков стоит
    // дорого, и платить за него, чтобы затем отказать по настройке, значит жечь чужой ресурс.
    if (!settingsUsable(settings)) {
      return {
        completedAt: new Date(),
        kind: 'showcase',
        selection: selectChartList([], settings.criterion, settings.volume, tuning),
        asked: task.entryIds.length,
        measured: 0,
      };
    }

    const candidates = await deps.port.measure(task);
    return {
      completedAt: new Date(),
      kind: 'showcase',
      selection: selectChartList(candidates, settings.criterion, settings.volume, tuning),
      asked: task.entryIds.length,
      measured: candidates.length,
    };
  }

  return {
    /**
     * Вход контракта. БРОСАЕТ, и это не недоделка.
     *
     * `PluginContext` задания не несёт — контракт хоста его не предусматривает, — а чарт-лист без
     * задания бессмыслен: отбирать не из чего. Подставить пустое задание значило бы позвать
     * измерение впустую и вернуть правдоподобный пустой результат, по которому не отличить «нечего
     * отбирать» от «позвали не в ту дверь». Рабочий вход журнала — `runWithTask`.
     *
     * Поймано собственным зубом: первая версия именно подставляла пустое задание и звала порт.
     */
    async execute(_ctx: PluginContext): Promise<RunResult> {
      throw new Error(
        'chart-list: execute без задания не исполним — у журнала свой вход runWithTask(ctx, task)',
      );
    },
    runWithTask,
  };
}
