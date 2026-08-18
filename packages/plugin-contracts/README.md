# @membrana/plugin-contracts

Словарь серверной плагинности Membrana. Эпик #1961; авторитет имён —
[`M1_VERDICT.md`](../../docs/meeting/server-plugin-foundation/M1_VERDICT.md): при любом
расхождении с другими носителями прав он. Владелец словаря — Архитектор: non-breaking —
PR + ревью архитектора; breaking (новый `kind`, изменение/удаление обязательного поля) —
ADR + консилиум.

Framework-нейтральный: ни Nest, ни Mongo внутри. `background-office` и `background-media`
зависят от него, не наоборот. ESM-only, как остальные `@membrana/*`; из CommonJS-модулей
office/media рантайм-значения (`isPluginId`, `HOME_REGISTRY`) берутся через `import()` —
прецедент `static-registry-runtime.provider.ts`; типы — обычным `import type`.

| Файл | Комната | Что несёт |
|---|---|---|
| `plugin-id.ts` | M1 | `PluginId` (branded, `<org>.<kind>.<slug>`), `isPluginId`, `PLUGIN_ID_PATTERN` |
| `manifest.ts` | M1 · M3′ · M5′ | `PluginManifest` (union), `HandlerManifest{windowSize}`, `ReportManifest`, `ShowcaseManifest{displayForm, description?}`, `DisplayForm`, `PLUGIN_KINDS`/`PluginKind` |
| `homes.ts` | M2 · A3-6 | `HOME_REGISTRY` (два дома), `HomeName`, `isHomeName`, `PLUGIN_RESULTS_DB`, `PLUGIN_RESULTS_COLLECTION` |
| `triggers.ts` | M4 | `PLUGIN_TRIGGERS` (три повода), `PluginTrigger`, `isPluginTrigger` |
| `plugin-event.ts` | M4 | `IPluginEvent<T>` + три payload первой волны |
| `run-records.ts` | M3 · M3′ | `RunAddress` (5 полей), `RunFingerprints`, `RunResult`, `RunRecord`, `RunRecordView`, `StateRecord`, `ConvergenceRecord`, `ResumeMode` |
| `executor.ts` | M1 · M3 · M4 | `PluginContext`, `PluginExecutor` |
| `host.ts` | M2 · M4 · M5′ | `IPluginHost` — шесть членов |

Базовый манифест — ровно пять полей (`id · version · kind · mountTarget · triggers`); полей
`enabled`/`label` не существует — включённость есть операция реестра. Зубы:
`yarn turbo run typecheck test --filter=@membrana/plugin-contracts` (типовые утверждения
проверяются `tsc -p tsconfig.test.json`, не только рантаймом).
