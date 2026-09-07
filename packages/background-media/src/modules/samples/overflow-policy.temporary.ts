/**
 * ВРЕМЕННАЯ КОНСТАНТА — СТАБ ПОЛЯ ПОЛИТИКИ БЛОКА B (`overflow-policy`, #2308).
 *
 * Коворк `cowork-buffer-full-stop`, блок A (#2307). Поле ответа `overflowPolicy` сервер обязан
 * читать из режима прибора (вердикт M1 — поле `bufferPolicy` на записи `Device`), но в
 * изолированной фазе этого поля нет. До интеграции — умолчание `stop`, совпадающее с нормой
 * M1 «умолчание при любой дыре — stop».
 *
 * Файл лежит в боевом каталоге, а не в `stubs/`, потому что боевому коду стабы импортировать
 * запрещено (зуб `stubs-not-in-production.test.ts`); временность — в имени файла, имени
 * константы и этой шапке.
 *
 * ИНТЕГРАЦИЯ (координатор): в `SamplesService.uploadOrRefuse` передать в mapper политику из поля
 * B и УДАЛИТЬ этот файл. Порча координатора: файл остался в ветке `integration` → красный.
 */
import type { OverflowPolicy } from './buffer-overflow-refusal';

export const TEMPORARY_OVERFLOW_POLICY_UNTIL_BLOCK_B: OverflowPolicy = 'stop';
