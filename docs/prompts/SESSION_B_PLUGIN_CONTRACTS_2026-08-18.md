# Сессия Б · PR-1: пакет контрактов серверной плагинности

> **Это твоя точка входа.** Читай только этот файл — он самодостаточен. Сессии В и Г
> ждут ТВОЙ пакет как зависимость и стартуют параллельно на его контракте; сессия А —
> про железо, не пересекается. Ты — фундамент, **твой PR блокирует всё остальное**.

## Где ты и что происходит

**Вторник 18 августа.** Вчера владелец провёл шторм и заседание по плагинной основе
сервера — 10 комнат по одному вопросу, независимый аудит, три переигрывания. Вердикт
**ратифицирован владельцем**, эпик — Issue #1961. Сегодня слово владельца: **внедрить
все принятые решения**. Реализация не начиналась — ты первый.

## Дерево

`C:\Users\user190825\practice\Membrana-product` (38 связей, сборка проверена).

```bash
cd C:/Users/user190825/practice/Membrana-product
git fetch origin && git switch -c feat/plugin-contracts origin/main
echo "owner: сессия Б (plugin-contracts) · занято: 2026-08-18" > .worktree-owner
```

## Источник истины — читать ДО кода, дословно

- `docs/meeting/server-plugin-foundation/MEETING_VERDICT.md` — сводный вердикт.
- `docs/meeting/server-plugin-foundation/M1_VERDICT.md` — **АВТОРИТЕТ словаря**; при
  любом расхождении с другими носителями прав он.
- `M2_VERDICT.md` (дома), `M4_VERDICT.md` (поводы, с эрратумом), протоколы M3′/M5′/M6′
  в `docs/seanses/server-plugin-foundation-m3r-*.md`, `-m5r-*.md`, `-m6r-*.md`.

## Задача — PR-1 по плану приёмки M6′

Создать пакет `packages/plugin-contracts` (`@membrana/plugin-contracts`) с экспортом
через `src/index.ts`. Состав — ТОЛЬКО то, что вынесли комнаты, поимённо:

**Из M1 (словарь):**
- `PluginId` — branded string, regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$`,
  валидатор `isPluginId(s): s is PluginId`; вид `<org>.<kind>.<slug>`, пример
  `membrana.handler.mfcc` (второй сегмент — РОД, не модуль).
- `PluginManifest` — РОВНО пять полей: `id: PluginId` · `version: string` (semver) ·
  `kind: 'handler' | 'report' | 'showcase'` · `mountTarget: HomeName` · `triggers: PluginTrigger[]`.
  **Шестого нет.** Полей `enabled`/`label` НЕТ (включённость — операция реестра).
- `HandlerManifest` / `ReportManifest` / `ShowcaseManifest` — расширяющие типы (discriminated
  union по `kind`).
- `PluginExecutor { execute(ctx: PluginContext): Promise<RunResult> }`, `RunResult { completedAt: Date; kind }`,
  `PluginContext` — тип (по M3: несёт адресные поля прогона; минимум — не заглушка, а
  то, что нужно executor'у для записи RunRecord).

**Из M2 (дома):**
- `HOME_REGISTRY` — статический const с двумя ключами: `'background-office/journal'`,
  `'background-media/collections'`; тип `HomeName` — ключи реестра.
- `IPluginHost` — три члена: `readonly mountTargetId: HomeName` · `registerPlugin(manifest, executor)`
  · `getRegisteredPlugins(): ReadonlyArray<PluginManifest>`. **Замечание аудита A2-3:**
  второй параметр — framework-нейтральный (executor/фабрика), НЕ Nest-тип `Type`.
- Плюс методы из M4/M5′ на том же интерфейсе: `notify(event: IPluginEvent)` ·
  `request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext)` ·
  `setPluginEnabled(id: PluginId, enabled: boolean)`.

**Из M3 + M3′ (дом результатов):**
- `RunAddress = { pluginId, version, collectionId, runId, mountTarget: HomeName }` — пять полей.
- `RunFingerprints = { inputHash, configHash }` — ОТДЕЛЬНЫЙ интерфейс, не часть адреса.
- `RunRecord` (документ: address, fingerprints, resumeMode: 'from-freeze' | 'fresh', completedAt, kind),
  `RunRecordView` (ответ чтения, добавляет `stale?: boolean`), `StateRecord` (kind:'state',
  frozenAt, windowStart, windowEnd, payload), `ConvergenceRecord`.
- `windowSize` — поле `HandlerManifest`, НЕ базового манифеста.
- Константы `PLUGIN_RESULTS_COLLECTION = 'plugin-results'`, `PLUGIN_RESULTS_DB = 'background-office'`
  — в пакете рядом с HOME_REGISTRY (не внутри него — находка A3-6).

**Из M4 (поводы):**
- `PLUGIN_TRIGGERS` const → тип `PluginTrigger`: ровно три —
  `journal.entry_created` · `collections.collection_created` · `collections.sample_added`.
- `IPluginEvent<T> { trigger, occurredAt, payload }` + три payload-типа.

**Из M5′ (витрина):**
- `DisplayForm = 'row' | 'table' | 'zone-map' | 'histogram' | 'time-series' | \`x-${string}\``.
- `ShowcaseManifest = PluginManifest & { kind: 'showcase'; displayForm: DisplayForm; description?: string }`.
- У `HandlerManifest`/`ReportManifest` витринных полей **физически нет**.

## Готово, когда

- [ ] `packages/plugin-contracts/package.json` с именем `@membrana/plugin-contracts`; экспорт только через `index.ts`.
- [ ] Все типы выше присутствуют; **ни одного лишнего поля** в базовом манифесте.
- [ ] Зубы рядом: `isPluginId` (три сегмента, точки, отказ на `mfcc-detector`), закрытость
      `PLUGIN_TRIGGERS`, discriminated union родов, `HOME_REGISTRY` с двумя ключами.
- [ ] `background-office` и `background-media` добавляют зависимость на пакет (не наоборот);
      никакого Nest-импорта внутри `plugin-contracts`.
- [ ] `yarn turbo run typecheck test --filter=@membrana/plugin-contracts` зелёный.
- [ ] PR ≤ 400 строк смыслового кода (иначе — два PR: типы / зубы). Влит через `yarn pr:ship`
      после ревью тимлида; в теле PR — ссылка на #1961 и M1_VERDICT.

## Границы

- **Не переоткрывать словарь.** Кажется, что поле нужно — не добавлять: владелец словаря
  Архитектор, breaking-изменение = ADR + консилиум. Запиши сомнение в отчёт.
- Не реализовывать хосты, Mongo, executor — это В и Г. Ты даёшь им контракт.
- Не трогать `packages/agenda` (клиентские контракты, 21 плагин).
- Коммитить только своё; `git add -A` запрещён.

## Доложить владельцу

Пакет влит (номер PR); список экспортов; сомнения по словарю (если были) — отдельным
списком, не молча реализованными.
