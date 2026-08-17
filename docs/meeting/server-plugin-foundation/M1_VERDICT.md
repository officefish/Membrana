# M1 — вердикт: словарь контрактов (АВТОРИТЕТ)

> Носитель вердикта. Протокол: `docs/seanses/server-plugin-foundation-m1-vocabulary-2026-08-17.md`.
> По вердикту аудита 17.08 M1 — **единственный авторитет словаря**: любые расхождения
> имён и составов в других комнатах разрешаются в пользу этого файла.

- **Имена:** `PluginManifest` · операции реестра `register`/`unregister`/`enable`/`disable`
  (включённость — **операция реестра, НЕ поле манифеста**) · `PluginExecutor.execute(ctx:
  PluginContext): Promise<RunResult>` · `RunResult { completedAt: Date, kind }`.
- **Три рода:** discriminated union — `kind: 'handler' | 'report' | 'showcase'`;
  расширяющие типы `HandlerManifest`, `ReportManifest`, `ShowcaseManifest`.
- **Дом словаря:** отдельный пакет `packages/plugin-contracts` (`@membrana/plugin-contracts`);
  office и media зависят от него, не наоборот.
- **Владелец словаря:** Архитектор (Vesnin). Класс 1 (non-breaking) — PR + ревью
  архитектора; класс 2 (breaking: новый kind, изменение/удаление обязательного поля) —
  ADR + консилиум.
- **Минимальный манифест — ровно ПЯТЬ полей, шестого нет:**
  1. `id: PluginId` — branded, вид `<org>.<kind>.<slug>`,
     regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$` (пример `membrana.handler.mfcc`;
     второй сегмент — РОД, не модуль);
  2. `version: string` (semver);
  3. `kind: 'handler' | 'report' | 'showcase'`;
  4. `mountTarget` — адрес дома крепления (типизация уточнена M2: `HomeName`);
  5. `triggers` — имена поводов (типизация уточнена M4: `PluginTrigger[]`).
