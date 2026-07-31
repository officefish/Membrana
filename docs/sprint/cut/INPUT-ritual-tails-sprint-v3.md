# Нарезка, версия 3 — с фактурой из дерева

Версия 2 отклонена: зоны указывали на `packages/procedures/ritual-evening/*.ts` — **такого каталога в репозитории нет**, все пять названных файлов не существуют. Семь исполнителей из девяти (`vedomosti`, `dahl`, `zaliznyak`, `kruglov`, `brockhaus`, `goncharov`, `belinsky`) **отсутствуют в реестре голосов**. Прогнозы «не затронутых» блоков были молча изменены при заявлении, что они не менялись.

Поэтому ниже — дерево как оно есть. Ничего не додумывай: если файла нет в списке, его нет в репозитории.

## Реестр голосов — ЗАКРЫТЫЙ список исполнителей

| id | kind | профиль | ограничение |
|---|---|---|---|
| `tarasov` | teamlead | нагрузки, связки ролей, вердикты, приёмка | ты; режешь, не программируешь |
| `vesnin` | architect | границы модулей, контракты, форма решения | с 27.07 не тимлид |
| `ozhegov` | advisor | термины, границы пакетов, словарь; линза докладов наружу | — |
| `dynin` | advisor | предикаты, разрешимость, статистика | судит по вычислимости |
| `kuryokhin` | advisor | смелые аудио-гипотезы | **в `ask` не заведён — легальное «нет»** |
| `rodchenko` | advisor | конструкция экрана, форма = сообщение | — |
| `angelina` | lead | секретарь и мастер процедур, гейт каскада | **КОДА НЕ ПИШЕТ** |
| `farrell` | voice | свободный голос | не гейт, не слот |

**Важно:** в версии 1 ты поставил `angelina` исполнителем двух блоков, которые правят скрипты (`ritual-evening-feedback-signature`, `morning-day-plan-sanitizer`). По реестру она кода не пишет. Переназначь.

## Файлы дерева — реальные пути и размеры

### Ф2 + Ф5 — кадр доставки и манифест вечера

| файл | строк | что там |
|---|---|---|
| `scripts/ritual-deliver-to-main.mjs` | 101 | CLI кадра доставки (утро) |
| `scripts/lib/ritual-deliver-to-main.mjs` | 153 | ядро: статусы `missing-on-main` / `stale` / `drift-from-main`, читает `docs/procedures/ritual-day/MANIFEST.json` |
| `scripts/lib/ritual-morning-artifacts.mjs` | 20 | список артефактов утра для доставки |
| `docs/procedures/ritual-evening/MANIFEST.json` | 86 | манифест вечера: `preflight`/`frames`/`post`, кадра доставки НЕТ |
| `docs/tasks/evening-ritual-steps.json` | 222 | 14 шагов вечера; строки 42 и 213 — легаси `STRATEGIC_PLAN_DAY.md` |
| `scripts/ritual-evening-run.mjs` | 184 | раннер цепочки; манифест процедуры НЕ читает |

Аналога `ritual-morning-artifacts.mjs` для вечера нет — его придётся завести.

### Ф3 + Ф4 — подпись фидбека и место показа

| файл | строк | что там |
|---|---|---|
| `scripts/team-evening-feedback.mjs` | 114 | CLI |
| `scripts/lib/team-evening-feedback-ritual.mjs` | 371 | ядро: сборка ролей, промпт, разбор ответа |
| `docs/virtual-team/voices.registry.json` | — | шесть советчиков; шаг собирает пятерых и подписывает `vesnin` тимлидом |

### Ф6 + Ф9 — аудит дня и индекс вещдоков (исполнитель назначен владельцем: `ozhegov`)

| файл | строк | что там |
|---|---|---|
| `scripts/audit-evening.mjs` | 158 | CLI, пишет `docs/DAILY_AUDIT.md` + `docs/archive/daily-day/<date>/audit.md` |
| `scripts/lib/audit-evening.mjs` | 375 | ядро хроники: репозиторий, реестр задач, граф правды |
| `scripts/lib/evidence-inventory.mjs` | 157 | сборка `docs/evidence/INDEX.md` из `registry.jsonl` |

Оба инструмента **работают** — проверены живьём 31.07. Работы по их коду может не быть вовсе: нужен провод в цепочку.

### У1 — генератор документа дня

| файл | строк |
|---|---|
| `scripts/_main-day-issue.mjs` | 617 |
| `scripts/main-day-issue.mjs` | 18 |

### У2 — санитарный блок плана дня

| файл | строк |
|---|---|
| `scripts/day-plan.mjs` | 154 |
| `scripts/lib/day-plan-assemble.mjs` | 114 |
| `scripts/lib/day-plan-frame.mjs` | 120 |
| `docs/comms/sent-log.jsonl` | — | источник правды об отправке (`sent=true`) |

### У3 — подпись и провенанс

| файл | строк |
|---|---|
| `scripts/canon-sign.mjs` | 55 |

### У4 — фрейм доклада

| файл | строк |
|---|---|
| `scripts/report-check.mjs` | 38 | зуб уже есть и работает |
| `docs/tasks/morning-ritual-steps.json` | 21 |
| `docs/procedures/ritual-day/MANIFEST.json` | — | здесь кадры утра |

### Ш1 + Ш2 — разведка (твоё решение из версии 1, сохраняется)

| файл | строк |
|---|---|
| `scripts/pr-ship.mjs` | 763 |
| `scripts/review-gate.mjs` | 137 |
| `scripts/code-review.mjs` | 217 |

Ветки для разведки: `origin/fix/review-gate-pr-head`, `origin/feat/ship-merge-state-guard`.

## Решения владельца (в силе, не пересматриваются)

1. Спринт **не откладывается**, окно — сегодня.
2. Исполнитель блока `ritual-evening-archive-evidence` — **`ozhegov`**.
3. **Манифесты одному блоку**: правки `docs/procedures/ritual-evening/MANIFEST.json` и `docs/tasks/evening-ritual-steps.json` — только в `ritual-evening-manifest-and-delivery`. Соседи правят свои скрипты.
4. Ф9 чиним **цепочкой**, зуб `evidence-inventory` не ослабляем.

## Твои прогнозы версии 1 — база для пересчёта

| блок | v1 |
|---|---|
| `ritual-evening-manifest-and-delivery` | 150 |
| `ritual-evening-feedback-signature` | 80 |
| `ritual-evening-archive-evidence` | 100 |
| `morning-main-day-issue-owner-awareness` | 60 |
| `morning-day-plan-sanitizer` | 70 |
| `canon-sign-preserves-provenance` | 30 |
| `morning-report-format-gate` | 40 (подтверждено тобой) |
| `ship-merge-state-guard-investigation` | 80 |
| `review-gate-pr-head-fix-investigation` | 60 |

## Что требуется

По каждому блоку: `persona` (**только id из таблицы выше**), `context`, `zone[]` (**только пути из списков выше**), `estimate.changedLines`, `//estimate-basis`.

Отдельно:
- переназначь два блока, где стояла `angelina`;
- скажи, меняются ли прогнозы после развода зон, и если да — от чего считаешь;
- если прогноз блока не меняется, так и скажи: «остаётся N».

Порог — 400 изменённых строк на **проход ревью**, не на блок.
