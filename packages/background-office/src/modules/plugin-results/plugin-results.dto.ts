/**
 * Форма тела `POST /plugin-results/runs` — приёмник моста media → office (блок b2 спринта
 * `plugin-results-bridge`, #1961; форма — `docs/plugins/results-bridge-form.md`).
 *
 * Схема повторяет контракты `@membrana/plugin-contracts` (`RunRecord`, `RunAddress`,
 * `RunFingerprints`, `StateRecord`) СТРУКТУРНО, как локальный zod-DTO, — по той же норме, что
 * `driftAnchorRecordSchema`: office автономен, а zod-схема из type не выводится. Имена полей —
 * ровно те, что в пакете контрактов; новых нет. Даты приходят ISO-строками (JSON) и становятся
 * `Date` здесь, на границе, — дальше служба видит тот же `RunRecord`, что и скрипт 18.08.
 *
 * `kind` у `RunRecord` — род плагина (M1: совпадает с родом); `mountTarget` — из закрытого
 * реестра домов (M2). `pluginId` проверяется валидатором пакета в `PluginResultsService.writeRun`
 * (там он уже есть) — здесь только «непустая строка», чтобы не держать две копии regex.
 */
import type { HomeName, PluginId, RunRecord, StateRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { z } from 'zod';

const isoDate = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'not an ISO date')
  .transform((s) => new Date(s));

/**
 * Бренд ставится на границе транспорта: regex пакета живёт в `isPluginId` и проверяется службой
 * (`writeRun`), здесь — только тип, чтобы DTO выводился В `RunRecord`, а не существовал рядом
 * вторым словарём (замечание Ожегова, b2). Две копии regex не заводятся.
 */
const pluginIdBrand = z.string().min(1).transform((s) => s as PluginId);

const HOME_NAMES = ['background-office/journal', 'background-media/collections'] as const satisfies readonly HomeName[];
// Полнота, не только принадлежность: `satisfies` говорит «каждый — дом», это — «все дома названы».
// Новый ключ в HOME_REGISTRY без правки здесь роняет typecheck, а не молча отвергает адрес 400-м.
type HomeNameMissingHere = Exclude<HomeName, (typeof HOME_NAMES)[number]>;
const HOME_NAMES_COMPLETE: [HomeNameMissingHere] extends [never] ? true : false = true;
void HOME_NAMES_COMPLETE;

export const runAddressSchema = z.object({
  pluginId: pluginIdBrand,
  version: z.string().min(1),
  collectionId: z.string().min(1),
  runId: z.string().min(1),
  mountTarget: z.enum(HOME_NAMES),
});

export const runFingerprintsSchema = z.object({
  inputHash: z.string().min(1),
  configHash: z.string().min(1),
});

export const runRecordSchema = z
  .object({
    address: runAddressSchema,
    fingerprints: runFingerprintsSchema,
    resumeMode: z.enum(['from-freeze', 'fresh']),
    completedAt: isoDate,
    kind: z.enum(['handler', 'report', 'showcase']),
  })
  // СОЗНАТЕЛЬНО passthrough. Исполнитель расширяет `RunResult` своими полями (MfccRunResult: пробы
  // и сводка в корне документа — так лежит живая запись 18.08, так её читает документ прогона), и
  // дом хранит документ целиком (`$set: {...run}`). HTTP-путь, пишущий беднее in-process-пути, дал
  // бы два облика одного дома. Возражение структурщика (теневой словарь через passthrough) —
  // именованный follow-up #1982 (держатель Веснин): карман `payload` в RunResult контракта либо
  // расширение в корне как норма. Закрывается там, не срезом здесь.
  .passthrough();

export const stateRecordSchema = z.object({
  pluginId: pluginIdBrand,
  version: z.string().min(1),
  collectionId: z.string().min(1),
  kind: z.literal('state'),
  frozenAt: isoDate,
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  payload: z.unknown(),
})
  // zod делает ключ с `unknown` необязательным в выводе, а контракт требует поле — обязательность
  // возвращается явным transform, а не ослаблением контракта (поймано типовым зубом DTO ↔ контракт).
  .transform((s): StateRecord => ({ ...s, payload: s.payload }));

export const writeRunBodySchema = z.object({
  run: runRecordSchema,
  state: stateRecordSchema.optional(),
});

export type WriteRunBodyDto = z.infer<typeof writeRunBodySchema>;

/**
 * DTO выводится В контракт, а не рядом с ним: проверяется типовой системой (зуб рядом).
 *
 * ЧТО ИМЕННО ГАРАНТИРУЕТСЯ (ревью PR #1981, P0): присваиваемость БАЗЫ — каждое именованное поле
 * DTO имеет тип поля контракта (`PluginId` брендом, `HomeName`, `ResumeMode`, `Date`, `PluginKind`),
 * и служба получает `RunRecord`, а не «почти RunRecord». НЕ гарантируется отсутствие лишних полей:
 * `RunRecordDto` несёт индексную сигнатуру от `.passthrough()` — это форма, названная выше, и
 * предмет #1982. Зуб честен ровно на ширину этого утверждения.
 */
export type RunRecordDto = z.infer<typeof runRecordSchema>;
export type StateRecordDto = z.infer<typeof stateRecordSchema>;
export const assertDtoMatchesContracts = (run: RunRecordDto, state: StateRecordDto): [RunRecord, StateRecord] => [run, state];
