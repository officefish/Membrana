/**
 * Исполнение — M1 (`execute`, одно имя метода на все роды: загрузчик держит один предикат
 * вызова, mock-плагин реализует один метод). Плагин реализует `PluginExecutor`; описание
 * (`PluginManifest`) и исполнение — два разных словаря, и они не смешиваются.
 */
import type { PluginTrigger } from './triggers.js';
import type { RunAddress, RunFingerprints, RunResult, ResumeMode } from './run-records.js';

/**
 * Контекст прогона. В M1 стоял заглушкой «до M3»; здесь — не заглушка, а минимум, нужный
 * исполнителю для записи `RunRecord`: адрес (M3′), отпечатки и объявление старта (M3), повод
 * и его payload (M4). Канала доставки здесь НЕТ намеренно: плагин не знает, живой это
 * `notify` или постфактум-`request` (M4) — `deliveryMode` в контракт не вводится.
 */
export interface PluginContext<TPayload = unknown> {
  readonly address: RunAddress;
  readonly fingerprints: RunFingerprints;
  readonly resumeMode: ResumeMode;
  readonly trigger: PluginTrigger;
  readonly payload: TPayload;
}

export interface PluginExecutor {
  execute(ctx: PluginContext): Promise<RunResult>;
}
