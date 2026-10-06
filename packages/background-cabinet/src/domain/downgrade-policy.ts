/**
 * Режим отбора живого при понижении тарифа — настройка мембраны (#2587 b4a; ADR-0031, решения
 * владельца 05.10: режим выбирает пользователь в кабинете, умолчание — «превышение над фоном»).
 *
 * ТРИ ЛИТЕРАЛА — ЗЕРКАЛО СЛОВАРЯ MEDIA (`background-media/.../downgrade-archive.vocabulary.ts`,
 * b3a): кабинет и сервер записей — разные пакеты, импортировать словарь через границу нельзя,
 * и копия названа копией. Расхождение ловит сервер записей отказом `unknown_criterion`, который
 * дверь кабинета отдаёт как есть. Четвёртого режима нет (вердикт команды 3/3 по chart-list).
 *
 * ОТСУТСТВИЕ СТРОКИ = УМОЛЧАНИЕ, значение вне списка на чтении → умолчание (fail-safe к самому
 * понятному режиму), как у срока хранения (`archive-retention.ts`). Модуль ЧИСТЫЙ: без базы и Nest.
 */
import type { TariffGridDocument, TariffSku } from './tariff-grid';
import { rankOf } from './tariff-transition';

export const DOWNGRADE_CRITERIA = ['loudness-over-floor', 'spectral-variety', 'drone-likeness'] as const;
export type DowngradeCriterion = (typeof DOWNGRADE_CRITERIA)[number];

/** Слово владельца 05.10 (решение 3): превышение над фоном. */
export const DEFAULT_DOWNGRADE_CRITERION: DowngradeCriterion = 'loudness-over-floor';

export function isDowngradeCriterion(value: unknown): value is DowngradeCriterion {
  return typeof value === 'string' && (DOWNGRADE_CRITERIA as readonly string[]).includes(value);
}

/** Что хранится → что действует: мусор и пустота читаются как умолчание, не как ошибка. */
export function resolveDowngradeCriterion(stored: unknown): DowngradeCriterion {
  return isDowngradeCriterion(stored) ? stored : DEFAULT_DOWNGRADE_CRITERION;
}

/**
 * Понижение ли переход по сетке: ранг цели строго ниже ранга текущего. `null` — один из тарифов
 * сетке неизвестен; решать за сетку («наверное понижение») здесь нельзя — это вопрос домена
 * перехода (`decideTransition` → `unknown_target_tariff`).
 */
export function isDowngrade(grid: TariffGridDocument, from: TariffSku, to: TariffSku): boolean | null {
  const fromRank = rankOf(grid, from);
  const toRank = rankOf(grid, to);
  if (fromRank === undefined || toRank === undefined) return null;
  return toRank < fromRank;
}
