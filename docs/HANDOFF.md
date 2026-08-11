# HANDOFF → 2026-08-11 · **реестр тулинга выверен: из 34 карточек живых 15; ось дня ждёт owner-choice**

**Точка входа новой сессии.** Хендоф 09.08 снят (архив —
[`docs/handoff/HANDOFF-2026-08-09.md`](handoff/HANDOFF-2026-08-09.md)).

Утро 11.08 прошло ревизией категории «Агентский тулинг, CI и техдолг»: все 34 карточки
проверены на свежесть по `origin/main` (@ `e77919dc`) четырьмя параллельными read-only
аудиторами. **19 оказались сделаны и забыты в реестре** — заархивированы с
индивидуальными свидетельствами (PR/SHA в notes каждой), отчёт —
[`docs/audit/tasks/analysis/registry-audit-2026-08-11.md`](audit/tasks/analysis/registry-audit-2026-08-11.md).
Реестр: active 171 → 152. Отменённых нет. Десятка ниже — **живой остаток категории**,
слово владельца 11.08: «актуальные — сегодняшний хендоф».

**Ось дня НЕ назначена.** Магистраль, выбранная генератором без owner-choice, не
принимается (рецидивы 16.07, 17.07, 21.07) — таблица ниже это поле выбора, а не приговор.

> **Заголовок этого файла читают генераторы.** Он обязан нести магистраль СЕГОДНЯШНЕГО
> дня. Прецедент 05–07.08: тело поправили, заголовок оставили — фантом возвращался три
> утра подряд.

## Как читать этот список

Каждая строка несёт **проверяемый маркер**, а не утверждение о состоянии (норма #1744).
Все вещдоки сверены с `origin/main` @ `e77919dc` аудиторами 11.08 утром — командой/файлом,
приведённым рядом, а не по памяти.

| # | Задача | Почему живая — вещдок | Размер | Занято |
|---|---|---|---|---|
| 1 | **`fix-node-modules-links-1647`** — резолюция `@membrana/*` в чужое дерево | `ls node_modules/@membrana` — ~20 симлинков от 29.07 смотрят в `Membrana-grok` (`core`, `background-office`, `detector-base`, …); typecheck office/harmonic ходит по чужому коду. #1810 дал диагностику (`worktree:resolve`), лечения и политики в CONTRIBUTING нет | S | свободно |
| 2 | **`fix-sprint-experience-dead-ends`** — живой путь записи опыта не растит seq | Шов: `sprint-experience.mjs:45` держит свой `RECORDS_PATH` против `FORECAST_RECORDS_REL_PATH` из `forecast-record-gate.mjs:27`; `seq` нигде не вычисляется (`forecast-record.mjs:75` — дефолт 1). После #1833 правок нет | S | свободно |
| 3 | **`tests-container-cross-package-imports`** — граф тестов слеп к `@membrana/*` и `.tsx` | `origin/main:scripts/lib/tests-container.mjs` — `resolveImport` открывается `if (!spec.startsWith('.')) return null`, `.tsx` в кандидатах нет. Держит эпик `tests-container` (его собственная работа сдана — ADR-0018) | S | свободно |
| 4 | **`tc-nightly-frame`** — ночной прогон не блокирует утро | Ложное срабатывание механики: иссью #1293 закрыта, но `blocksMorningWhen` в `ritual-day/MANIFEST.json` — единственное вхождение по дереву (потребителя нет), `tests:nightly-full` не вшит ни в `ritual:day`, ни в workflow | M | свободно |
| 5 | **`worktrees-align`** ([#1738](https://github.com/officefish/Membrana/issues/1738), REOPENED владельцем) | Сухой прогон на 10 деревьях доказан (PR #1740), мутирующий `--apply` под owner-гейтом не запускался; замера `sprint:experience` нет (`docs/sprint/experience/worktrees-align.*` отсутствует в main) | M | свободно |
| 6 | **`friction6-scripts-lint`** ([#1264](https://github.com/officefish/Membrana/issues/1264)) — `scripts/**/*.mjs` вне линтера | `.eslintrc.cjs` — ни одного override для `scripts/**/*.mjs`, «Parsing error: The keyword 'import' is reserved» воспроизводится; flat-config в репо нет | M | свободно |
| 7 | **`friction6-hygiene-notes`** ([#1265](https://github.com/officefish/Membrana/issues/1265)) — реестр скриптов дрейфует | `scripts/registry/SCRIPTS_LIST.md` несёт `2026-07-30, 407 скриптов` — в main их 439; регенерацию (`scripts:registry`) не зовёт ни вечер, ни ночь, ни CI. Грабли-часть уже в AGENTS.md (PR #1280) | S | свободно |
| 8 | **`friction6-secret-inventory`** ([#1266](https://github.com/officefish/Membrana/issues/1266)) — не начата | `secret:inventory` в `package.json` main нет (439 скриптов, grep пуст); ядро `secret-redact.mjs` для обёртки существует | S | свободно |
| 9 | **`tw-declared-verbs-honest-no`** — развилка владельца | `docs/tasks/workshop.manifest.json:13-15` в main: три `planned:`-глагола без движков (`task:board` — падает живьём, поймано этим утром; `bookkeeping`, `reviewing`). Решение: строить или объявить `declared-not-built` | S | **ждёт слова** |
| 10 | **`one-shot-trail-forecast-fact`** — след шота без прогноза и факта | `origin/main:scripts/one-shot-trail.mjs` — команды только `check\|record\|ensure`, слов `brief`/`executor`/`forecast` в файле ноль; лента несёт `{timestamp, path, slug, headRev, status}` | M | свободно |

## Остаток категории вне десятки (живые, меньший приоритет)

- **`leveling-snapshot-out-path`** — дефект воспроизводится: `membrana-leveling-snapshot.mjs:108`
  `join(cwd, args.out)` без `isAbsolute`; та же болезнь в `workspace-level.mjs:96`. Тривиальный S.
- **`notes-regex-cyrillic-translit`** — обе грабли (`\w`/`\b` ASCII; транслит при сверке
  латинских имён с русскими) до AGENTS.md не доехали, промпт-шаблон пуст. S.
- **`sprint-cut-teeth-to-live-modules`** — корректный отложенный долг: условие
  («стабильный контракт живой петли опыта») не наступило, брать после строки 2.
- **`tests-container`** (эпик, L) — держится только строкой 3; своя работа в main.
- **`agent-tooling-friction-6`** (зонтик, M) — жив строками 6–8; своей работы нет.
  Оба зонтика закрываются автоматически при закрытии детей.

## Попутные находки аудита 11.08 (кандидаты в карточки, не заведены)

1. **Регрессия Ф3**: глагол `worktree:merge` снят из `package.json` PR #1285, скрипт
   `scripts/worktree-merge.mjs` жив сиротой — слияние в изоляции через yarn недоступно.
2. **`docs/tasks/dead-wire-pending.json`**: у всех 6 записей `until: 2026-08-09` истёк —
   зуб `dead-wire:check` должен краснеть.
3. **Документация OC** зовёт несуществующие алиасы `llm-proxy:ask`/`smoke`,
   `opencode:membrana` (хвост записан в архивах OC3/OC4).
4. **Системное**: `githubIssueClosedAt` пуст у active-карточек с иссью — чинится
   `yarn tasks:sync-issues`; зонтики в схеме не помечены (`umbrella: true` напрашивается).

## Зеркальные мёртвые души — иссью, ждущие вечернего `task:close-github`

У пяти заархивированных карточек иссью ещё **открыты**:
[#1764](https://github.com/officefish/Membrana/issues/1764),
[#1447](https://github.com/officefish/Membrana/issues/1447),
[#1422](https://github.com/officefish/Membrana/issues/1422),
[#1272](https://github.com/officefish/Membrana/issues/1272),
[#554](https://github.com/officefish/Membrana/issues/554) — работа в main, бумага открыта.

## Ловушки 08–09.08 — перенесены без изменений, не наступать снова

- **Запечатанную запись журнала прогонов править нельзя** — чинится порядком строк
  (`append`/`amend`), не рукой: `ledger.leafHash` ломается.
- **Конфликт append-only журналов разрешается СОЮЗОМ**, не выбором стороны.
- **Ветку заводить ДО первой правки** — дописывать в отревьюенный PR запрещено.
- **Переключение ветки теряет owner-choice** — состояние гейтов лежит файлом в репо.
- **Нулевой байт делает файл бинарным для git** — 224 строки, невидимые ревьюеру.
- **Отметки следов брать из источника** (`op-log`, `date -u`), не из головы.
