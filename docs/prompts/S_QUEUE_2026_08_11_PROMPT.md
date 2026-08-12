# S-очередь дня 11.08 — семь S-строк живого остатка тулинг-ревизии

**Карточка:** `s-queue-2026-08-11` · размер S · `sprintKind: membrana-local-sprint`
**Слово владельца:** 11.08 «Делаем сначала s» — S-очередь вперёд, магистраль
(`angelina-hostess-impl`) следом.
**Маршрут:** спринт, не шоты — 7 строк через one-shot дают предсказуемый красный
анти-цепочки (`evaluateOneShotS`: ≤3 выстрела / ≤8 файлов / ≤200 строк за 7 суток);
«прогонять S ради предсказуемого красного = церемония» (штамп Тарасова 10.08,
`docs/discussions/cut-s-queue-tail-vesnin.md`).

## Контекст

Утром 11.08 ревизия категории «Агентский тулинг, CI и техдолг» (34 карточки, 4
параллельных аудитора, отчёт `docs/audit/tasks/analysis/registry-audit-2026-08-11.md`)
оставила 15 живых. Все S-строки живого остатка собраны этой очередью; вещдоки каждой
сверены с `origin/main` аудиторами и записаны в HANDOFF 11.08.

## Строки очереди (каждая — свой блок нарезки, своя карточка остаётся в реестре)

1. **`fix-node-modules-links-1647`** — ~20 симлинков `node_modules/@membrana/*`
   смотрят в чужое дерево `Membrana-grok`; инвентарь → причина → переустановка →
   зелёный однопакетный typecheck office/harmonic → заметка в CONTRIBUTING.
2. **`fix-sprint-experience-dead-ends`** — живой путь записи опыта: снять вторую
   правду пути (`RECORDS_PATH` в `sprint-experience.mjs` против
   `FORECAST_RECORDS_REL_PATH` гейта), дать вычисление `seq` по ленте (дедуп
   перестаёт молча глотать новый прогноз после перерезки), зуб на оба.
3. **`tests-container-cross-package-imports`** — `resolveImport` в
   `scripts/lib/tests-container.mjs` видит `@membrana/*` (через `workspaces`) и
   `.tsx`/`index.tsx`; замер «сужает ли ещё» после расширения графа.
4. **`friction6-hygiene-notes` (#1265)** — регенерация реестра скриптов перестаёт
   быть ручной: `scripts:registry` встаёт в вечернюю цепочку; дрейф снимка
   (407 против 439) гасится прогоном; грабля «foreground sleep заблокирован» — в
   AGENTS.md отдельной строкой.
5. **`friction6-secret-inventory` (#1266)** — `yarn secret:inventory <dir|glob>`
   поверх ядра `secret-redact.mjs`: таблица файл × класс правила × вхождений,
   `--json`, значения не выводятся ни в одном режиме, honest-оговорка «верхняя
   граница»; три зуба (детерминизм, синтетические образцы всех классов, ни одно
   значение не в выводе).
6. **`leveling-snapshot-out-path`** — `join(cwd, args.out)` → `resolve` (или
   `isAbsolute`-ветка) в `membrana-leveling-snapshot.mjs` и
   `membrana-leveling-workspace-level.mjs`; зуб на абсолютный путь.
7. **`notes-regex-cyrillic-translit`** — обе грабли в раздел граблей AGENTS.md
   (норма TF-7, руками): `\w`/`\b` ASCII даже с флагом `u`; сверка латинских
   машинных имён с русскими склоняемыми — только через транслит/словарь.

## Приёмка очереди

- Каждый блок закрыт → соответствующая карточка реестра архивируется с
  notes-свидетельством (PR/SHA) — `yarn task:archive`.
- `sprint:gate` pass по honest_pair всех блоков; прогноз ↔ исход записан
  (`sprint:experience`, ADR-0026).
- Иссью #1265, #1266 закрываются вечерним `task:close-github`.

## Вне предмета

- Магистраль `angelina-hostess-impl` — после очереди, отдельной работой.
- `tw-declared-verbs-honest-no` — ждёт развилки владельца, в очередь не входит.
- Серверные пути (`packages/background-*`, `deploy/`) не трогаются.
