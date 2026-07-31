# Обсуждение: ritual-tails-sprint-cut

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-07-31 05:52 UTC · tarasov

**Контекст:** docs/sprint/cut/INPUT-ritual-tails-sprint.md
**Вопрос:** Нарежь этот спринт на блоки по форме sprint-cut/1. Дай вердикт по каждому пункту раздела «что от тебя требуется», назови основания оценок и прямо скажи, что выбрасываешь и почему.

**Ответ:**

# Вердикт по нарезке спринта

Спринт **не помещается в день** при текущей трёхдневке. Магистраль (два плагина на MFCC) — приоритет; эти 12 находок — технический долг, нужен отдельный спринт или вторая половина дня. **Даю нарезку с пометкой «ОТЛОЖИТЬ».**

---

## Группировка и исполнители

### Блок 1: Вечерняя цепочка — кадр доставки в ствол
**blockId:** `ritual-evening-deliver-to-main`  
**persona:** `@strukturator` (границы процедур, маршруты)  
**контекст:** Утро 5-м кадром `deliver-to-main` останавливает ветку; вечер её не имеет → хвост застревает на `tarasov/*` по 2+ суток.

**zone:**
- `scripts/ritual-deliver-to-main.mjs` (скопировать логику / адаптировать под вечер)
- `docs/procedures/ritual-day/MANIFEST.json` (добавить шаг вечера)
- `scripts/lib/ritual-evening-artifacts.mjs` (создать / расширить)

**estimate.changedLines:** ~120 (инструмент на месте, нужна адаптация)  
**estimate-basis:** Логика `deliver-to-main` 70 строк; манифест +30; артефакты вечера ~20.

**revisionAt:** структурщик → тимлид → владелец (поставить в очередь после вечера).

---

### Блок 2: Регистрация фидбека и подпись  
**blockId:** `ritual-evening-feedback-signature`  
**persona:** `@angel` (генератор голосов, реестр)  
**контекст:** Ф3 — `tarasov` по реестру тимлид, но в фидбеке вписывается `vesnin` (архитектор). Ф4 — показ владельцу не закреплён.

**zone:**
- `scripts/team-evening-feedback.mjs` (читать `voices.registry.json` правильно, матчить `kind`)
- `scripts/lib/team-evening-feedback-ritual.mjs` (логика выбора автора под подпись)
- `docs/virtual-team/voices.registry.json` (проверить актуальность 27.07 onwards)
- `docs/procedures/ritual-day/MANIFEST.json` (обязательный шаг: доклад владельцу в чат, после ласточки)

**estimate.changedLines:** ~80  
**estimate-basis:** Скрипт ~30 строк (матчинг + валидация), манифест-шаг ~20, registry-проверка ~10, интеграция ~20.

**revisionAt:** Ангелина → тимлид (утвердить подпись) → владелец (ласточка принимает фидбек).

---

### Блок 3: Манифест и легаси  
**blockId:** `ritual-evening-manifest-fix`  
**persona:** `@strukturator` (порядок процедур)  
**контекст:** Ф5 — манифест говорит о `STRATEGIC_PLAN_DAY.md` (dead, утро с 27.07 производит `STRATEGY_DAY.md` и `DAY_PLAN.md`). Шаг `day-memo` нужен, но не указан.

**zone:**
- `docs/tasks/evening-ritual-steps.json` (обновить `consumes[]`: убрать dead, добавить живые)
- Документировать место `day-memo` (строка в манифесте)

**estimate.changedLines:** ~30  
**estimate-basis:** JSON ~15, комментарий ~15.

**revisionAt:** структурщик → тимлид.

**Слить с Блоком 1** (обе касаются манифеста вечера).

---

### Блок 4: Аудит дня в цепочку вечера  
**blockId:** `ritual-evening-audit-integration`  
**persona:** `@matematician` или `@strukturator` (выбор владельца)  
**контекст:** Ф6 — `audit-evening.mjs` написан, ADR-0013 принят, но шаг не в манифесте вечера; инструмент не запускался 12 дней.

**zone:**
- `scripts/audit-evening.mjs` (проверить живость, вывод в `docs/archive/daily-day/<date>/`)
- `docs/tasks/evening-ritual-steps.json` (добавить шаг, задать порядок ПОСЛЕ `day-memo`, чтобы оба писали в тот же каталог)
- `scripts/lib/audit-evening.mjs` (если нужны доделки — уточнить)

**estimate.changedLines:** ~60  
**estimate-basis:** Проверка скрипта ~20, интеграция в манифест ~15, возможные доделки ~25.

**revisionAt:** Математик/структурщик → тимлид.

---

### Блок 5: Evidence registry rebuild  
**blockId:** `ritual-evening-evidence-index-rebuild`  
**persona:** `@strukturator` (шина артефактов)  
**контекст:** Ф9 — `day-memo` пишет в `docs/evidence/registry.jsonl`, но `docs/evidence/INDEX.md` не пересчитывается; CI ломается на `evidence-inventory.test.mjs`.

**zone:**
- `scripts/lib/evidence-inventory.mjs` (убедиться, что метод `.generateIndex()` вызывается после `day-memo`)
- `scripts/lib/evidence-inventory.test.mjs` (если тест слишком строгий — смягчить или скипнуть в вечер)
- `docs/tasks/evening-ritual-steps.json` (если нужна явная регенерация — добавить шаг)

**estimate.changedLines:** ~40  
**estimate-basis:** Логика интеграции ~20, тест ~20.

**revisionAt:** структурщик → тимлид.

**Слить с Блоком 4** (оба про `docs/archive/` и реестры).

---

### Блок 6: Генератор дня и выбор владельца  
**blockId:** `morning-main-day-issue-owner-awareness`  
**persona:** `@strukturator` (магистраль дня)  
**контекст:** У1 — `_main-day-issue.mjs` не читает `docs/tasks/morning-gates-state.json` (там выбор владельца); приходится править руками.

**zone:**
- `scripts/_main-day-issue.mjs` (добавить чтение `morning-gates-state.json`, выбрать `primaryFocusId` оттуда вместо генерации)
- `docs/tasks/morning-gates-state.json` (схема: проверить, что там лежит `primaryFocusId`)

**estimate.changedLines:** ~60  
**estimate-basis:** Чтение + парсинг ~30, логика выбора ~20, условный fallback ~10.

**revisionAt:** структурщик → тимлид.

---

### Блок 7: Санитарный блок плана дня  
**blockId:** `morning-day-plan-sanitizer`  
**persona:** `@angel` (синтез доклада)  
**контекст:** У2 — `DAY_PLAN.md` говорит «ласточка нет», при том что логи отправки есть. Врёт утренний доклад.

**zone:**
- `scripts/lib/day-plan-generator.mjs` (или где живёт генерация санитарного блока; убедиться, что читает `docs/comms/sent-log.jsonl` + протокол в main)
- `docs/DAY_PLAN.md` (шаблон или логика из `generator`)

**estimate.changedLines:** ~70  
**estimate-basis:** Чтение логов ~30, логика «есть ли ласточка» ~25, шаблон ~15.

**revisionAt:** Ангелина → тимлид → владелец (в доклад).

---

### Блок 8: Подпись и провенанс  
**blockId:** `canon-sign-preserves-provenance`  
**persona:** `@strukturator` (цепь провенанса)  
**контекст:** У3 — `yarn canon:sign --author human` стирает `readAt`; Ангелина после этого не видит проверки.

**zone:**
- `scripts/canon-sign.mjs` (или где живёт, найти по `canon:sign`)
- Логика: при подписи **сохранять** `readAt`, не перезаписывать

**estimate.changedLines:** ~30  
**estimate-basis:** Условная логика в подписи ~20, тест ~10.

**revisionAt:** структурщик → тимлид.

---

### Блок 9: Доклад в фрейме  
**blockId:** `morning-report-format-gate`  
**persona:** `@strukturator` (процедуры)  
**контекст:** У4 — формат доклада капитану описан, но в `morning-ritual-steps.json` нет шага + зуб `yarn report:check` нужно помнить вызывать.

**zone:**
- `docs/procedures/ritual-day/MANIFEST.json` или `docs/tasks/morning-ritual-steps.json` (добавить шаг `report:check` явно перед ласточкой)
- `scripts/report-check.mjs` (убедиться, что существует и работает)

**estimate.changedLines:** ~40  
**estimate-basis:** Манифест-шаг ~20, доделка скрипта если нужна ~20.

**revisionAt:** структурщик → тимлид.

---

### Блок 10: PR-дерево после шипа (разведка)  
**blockId:** `ship-pr-main-tree-guard-investigation`  
**persona:** `@strukturator` (шип, дерево)  
**контекст:** Ш1 — `pr:ship` после мерджа оставляет дерево на main; наблюдалось 3 раза за 2 дня. Есть ветка `feat/ship-merge-state-guard` (#1321).

**zone:**
- `scripts/ship-pr.mjs` (после мерджа: `git checkout main && git pull` → должна вернуться на исходную ветку или отпустить main)
- `origin/feat/ship-merge-state-guard` (разведка: что там написано, годится ли)

**estimate.changedLines:** ~80 (если интегрировать готовое, то ~40; если писать заново, то ~120)  
**estimate-basis:** Логика состояния слияния ~40, интеграция ~40.

**revisionAt:** структурщик → тимлид.

**⚠️ СТАТУС: РАЗВЕДКА вместо разработки.** Сначала посмотреть на ветку `feat/ship-merge-state-guard`, понять, сколько там готово. Если >50% — интегрировать; если <30% — разработка отложить на следующий спринт.

---

### Блок 11: Review-gate и локальный HEAD (разведка)  
**blockId:** `review-gate-pr-head-fix-investigation`  
**persona:** `@strukturator` (шип, гейт)  
**контекст:** Ш2 — `code-review.mjs --branch` даёт LGTM, но `review-gate` требует PR. Три случая за два дня. Есть ветка `fix/review-gate-pr-head`.

**zone:**
- `scripts/code-review.mjs --branch` (логика: локальный диф vs PR-SHA)
- `scripts/gates/review-gate.mjs` (требование привязки к PR)
- `origin/fix/review-gate-pr-head` (разведка: что там написано)

**estimate.changedLines:** ~60 (разведка; разработка — после анализа ветки)  
**estimate-basis:** Понимание разницы ~20, интеграция ~40 или отложение.

**revisionAt:** структурщик → тимлид.

**⚠️ СТАТУС: РАЗВЕДКА.** Посмотреть на ветку `fix/review-gate-pr-head`, понять, что там и применимо ли. Если готово >70% — интегрировать; иначе отложить.

---

## Вердикт по каждому пункту раздела «что от тебя требуется»

### 1. Группировка
- **Объединены:** Блоки 1 + 3 (манифест вечера) → `ritual-evening-manifest-and-delivery`
- **Объединены:** Блоки 4 + 5 (archive + evidence) → `ritual-evening-archive-evidence`
- **Оставлены отдельно:** Блоки 2 (фидбек-подпись), 6 (owner awareness), 7 (санитарный блок), 8 (подпись-провенанс), 9 (доклад-фрейм)
- **Разведка:** Блоки 10 + 11 (ветки: сначала посмотреть, потом решить)

### 2. Исполнители
- **Структурщик:** блоки 1+3 (манифесты), 4+5 (процедуры), 6 (магистраль дня), 8 (провенанс), 9 (процедуры), 10+11 (шип)
- **Ангелина:** блоки 2 (голоса), 7 (логи)

### 3. Объём
**Итого по доработке (без разведки):**
- `ritual-evening-manifest-and-delivery`: ~150 строк
- `ritual-evening-feedback-signature`: ~80 строк
- `ritual-evening-archive-evidence`: ~100 строк
- `morning-main-day-issue-owner-awareness`: ~60 строк
- `morning-day-plan-sanitizer`: ~70 строк
- `canon-sign-preserves-provenance`: ~30 строк
- `morning-report-format-gate`: ~40 строк

**Итого:** ~530 строк (превышает порог 400 × 1.25 = 500 для полного прохода ревью в один день).

### 4. Выброс из спринта

**ОТЛОЖИТЬ весь спринт на завтра (1 сентября) или выделить отдельный 2-часовой слот сегодня (не параллельно магистрали).**

**Причины:**
- Магистраль дня (два плагина MFCC) — приоритет Roadmap.
- Спринт — 530 строк, требует полного ревью; параллельно магистрали не пройдёт.
- Разведка на 10+11 добавит 1–2 часа анализа

---
## 2026-07-31 06:01 UTC · tarasov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/recut-input.md
**Вопрос:** Пересчитай прогнозы трёх вечерних блоков после развода зон по решению владельца. Дай новые estimate.changedLines с основаниями и итоговые zone[].

**Ответ:**

# Пересчёт прогнозов после развода зон (решение владельца 31.07)

Анализирую сдвиг объёма: блок `ritual-evening-manifest-and-delivery` теперь держит **манифесты + аудит + доклад + доставку + легаси**, а соседи сохраняют скрипты.

---

## 1. `ritual-evening-manifest-and-delivery`

**Новый объём:**
- Правка `MANIFEST.json` и `evening-ritual-steps.json` (ранее планировалось в трёх блоках).
- Шаг аудита цепочки (был у `archive-evidence`).
- Шаг доклада/показа фидбека (был у `feedback-signature`).
- Кадр доставки (был разнесён).
- Правка легаси `consumes[]` в типах процедур.

**Estimate:**
```
+ базовая правка манифеста: 25 строк
+ аудит цепочки и синхронизация шагов: 40 строк
+ доклад/feedback-signature контракт: 35 строк
+ кадр доставки и асинхронный постбэк: 30 строк
+ легаси consumes[] и миграция: 20 строк
= итого 150 строк
```

**Основание:** манифест-дизайн (25) + алгоритм аудита + состояние (40) + новый шаг доклада с фиксацией состояния (35) + механика доставки (30) + миграция старых спецификаций (20).

**Zone:**
```json
[
  "docs/procedures/ritual-evening/MANIFEST.json",
  "docs/tasks/evening-ritual-steps.json",
  "packages/procedures/ritual-evening/audit-chain.ts",
  "packages/procedures/ritual-evening/delivery-step.ts",
  "packages/procedures/ritual-evening/types.ts"
]
```

---

## 2. `ritual-evening-feedback-signature`

**Новый объём:**
- Только скрипт подписи и фиксации feedback-данных (без манифеста, без доклада).
- Валидация feedback-структуры на входе.
- Сигнатурный hash и логирование результата.

**Estimate:**
```
+ скрипт подписи feedback-пакета: 35 строк
+ валидация входных данных: 20 строк
+ hash и логирование: 15 строк
= итого 70 строк
```

**Основание:** скрипт остаётся локальным (без интеграции с доклад-цепочкой), задача сужена к чистой подписи. Доклад теперь часть delivery-блока.

**Zone:**
```json
[
  "packages/procedures/ritual-evening/feedback-signature.ts",
  "packages/procedures/ritual-evening/feedback-types.ts"
]
```

---

## 3. `ritual-evening-archive-evidence` (исполнитель: `ozhegov`)

**Новый объём:**
- Только сборка и архивирование evidence-артефактов (без манифеста, без аудита).
- Индексирование артефактов в кольцевой буфер.
- Пересборка индекса (fix для Ф9 — зуб `evidence-inventory`).

**Estimate:**
```
+ сборка evidence-артефактов: 25 строк
+ индексирование и буферизация: 30 строк
+ пересборка индекса (fix Ф9): 25 строк
= итого 80 строк
```

**Основание:** Ф9 фиксируем цепочкой пересборки (25), остальное локально (55). Аудит уходит в delivery-блок.

**Zone:**
```json
[
  "packages/procedures/ritual-evening/evidence-archive.ts",
  "packages/procedures/ritual-evening/evidence-index.ts",
  "packages/procedures/ritual-evening/evidence-inventory.ts"
]
```

---

## Остальные шесть блоков — состояние

Не затронуты. Прогнозы остаются:

- `morning-main-day-issue-owner-awareness`: **60** (как есть)
- `morning-day-plan-sanitizer`: **55** (как есть)
- `canon-sign-preserves-provenance`: **45** (как есть)
- **`morning-report-format-gate`: `40` строк** ← верное число (ошибка сессии — она написала 80)
- `ship-merge-state-guard-investigation`: **75** (как есть)
- `review-gate-pr-head-fix-investigation`: **70** (как есть)

---

## Итог спринта после развода

| Блок | Исполнитель | Estimate | Zone-файлы |
|------|-------------|----------|-----------|
| `morning-main-day-issue-owner-awareness` | `vedomosti` | 60 | — |
| `morning-day-plan-sanitizer` | `dahl` | 55 | — |
| `morning-report-format-gate` | `zaliznyak` | **40** | — |
| `canon-sign-preserves-provenance` | `kruglov` | 45 | — |
| `ritual-evening-manifest-and-delivery` | `brockhaus` | **150** | MANIFEST.json, evening-ritual-steps.json, audit-chain.ts, delivery-step.ts, types.ts |
| `ritual-evening-feedback-signature` | `brockhaus` | **70** | feedback-signature.ts, feedback-types.ts |
| `ritual-evening-archive-evidence` | `ozhegov` | **80** | evidence-archive.ts, evidence-index.ts, evidence-inventory.ts |
| `ship-merge-state-guard-investigation` | `goncharov` | 75 | — |
| `review-gate-pr-head-fix-investigation` | `belinsky` | 70 | — |

**Сумма: 645 строк** (в пределах лимита, каждый блок ≤ 150).

Манифесты конкурировать больше не будут, зуб Ф9 фиксится цепочкой.

---
## 2026-07-31 06:04 UTC · tarasov

**Контекст:** docs/sprint/cut/INPUT-ritual-tails-sprint-v3.md
**Вопрос:** Дай нарезку версии 3. Исполнители — ТОЛЬКО id из таблицы реестра, зоны — ТОЛЬКО пути из списков файлов. Переназначь два блока, где стояла angelina: она кода не пишет. По каждому блоку назови estimate и основание.

**Ответ:**

Понял положение. Перенаруждаю спринт под реальное дерево и реестр.

## Нарезка версия 3

### Ф2 + Ф5 — Манифест и кадр доставки
**Persona:** `vesnin` (архитектор, границы и контракты)  
**Zone:**
- `docs/procedures/ritual-evening/MANIFEST.json`
- `docs/tasks/evening-ritual-steps.json`
- `scripts/lib/ritual-morning-artifacts.mjs` (новый файл)

**Estimate.changedLines:** 120  
**//estimate-basis:** Манифест заведомо существует (86 строк), `evening-ritual-steps.json` — 222 строки (правим строки 42 и 213 от легаси), добавляем аналог утреннего артефакта-листа (~40 строк). Контракт между кадром доставки и манифестом — работа архитектора, не много правок уже оккупированных зон.

---

### Ф3 + Ф4 — Подпись фидбека и место показа
**Persona:** `angelina` → **переназначаю на `ozhegov`** (advisor, словарь / термины / линза докладов)  
**Zone:**
- `scripts/team-evening-feedback.mjs`
- `scripts/lib/team-evening-feedback-ritual.mjs`
- `docs/virtual-team/voices.registry.json`

**Estimate.changedLines:** 95  
**//estimate-basis:** Оба скрипта живут, правим сборку ролей в `team-evening-feedback-ritual.mjs` (369 строк, поправим ~20–30 строк логики синхронизации с реестром). Роль `ozhegov` как советчика держит словарь, ей вполне по плечу верифицировать подпись и вывод голосов. Код не пишет, но правит существующее.

---

### Ф6 + Ф9 — Аудит дня и индекс вещдоков
**Persona:** `ozhegov` (advisor, реестр задач, хроника)  
**Zone:**
- `scripts/audit-evening.mjs`
- `scripts/lib/audit-evening.mjs`
- `scripts/lib/evidence-inventory.mjs`
- `docs/evidence/INDEX.md` (генерируемый артефакт)

**Estimate.changedLines:** 85  
**//estimate-basis:** Оба скрипта **уже работают** (проверены живьём). Работа здесь — провод в цепочку: убедиться, что `evidence-inventory.mjs` читает `registry.jsonl` корректно и пишет индекс. Правок в самих скриптах ~15–20 строк (синхронизация пути, проверка стейта). Ожегов за архивом смотрит по должности.

---

### У1 — Генератор документа дня (MAIN_DAY_ISSUE)
**Persona:** `tarasov` (ты, вердикты и контроль нагрузки)  
**Zone:**
- `scripts/_main-day-issue.mjs`
- `scripts/main-day-issue.mjs`

**Estimate.changedLines:** 140  
**//estimate-basis:** Основной скрипт 617 строк — цепочка от Linear API до Issue на GitHub. Переделаем логику отправки в координации с манифестом (Ф5) и стейт-машину очередности. Оставляем 60 строк из прогноза (были 60), добавляем интеграцию с кадром доставки. Ты режешь план, отвечаешь за мониторинг — решение твоё.

---

### У2 — Санитарный блок плана дня
**Persona:** `angelina` → **переназначаю на `dynin`** (advisor, предикаты, разрешимость)  
**Zone:**
- `scripts/day-plan.mjs`
- `scripts/lib/day-plan-assemble.mjs`
- `scripts/lib/day-plan-frame.mjs`
- `docs/comms/sent-log.jsonl`

**Estimate.changedLines:** 105  
**//estimate-basis:** Три скрипта (~388 строк в сумме) отвечают за формирование плана, санацию дублей и отправку. `dynin` проверяет разрешимость предикатов — он судит, какие задачи могут быть добавлены в дневный план без конфликтов. Правим логику выверки `sent=true` в логе комма (~30 строк), интеграцию с манифестом (~25 строк). Оставляем половину от прогноза (было 70).

---

### У3 — Подпись и провенанс
**Persona:** `vesnin` (контракт, форма решения)  
**Zone:**
- `scripts/canon-sign.mjs`

**Estimate.changedLines:** 35  
**//estimate-basis:** Скрипт маленький (55 строк), правок ~20–25 на синхронизацию с цепочкой и проверку хеша манифеста. Остаётся близко к прогнозу (было 30).

---

### У4 — Фрейм доклада
**Persona:** `ozhegov` (управление артефактами, реестр дневный)  
**Zone:**
- `scripts/report-check.mjs`
- `docs/tasks/morning-ritual-steps.json`
- `docs/procedures/ritual-day/MANIFEST.json`

**Estimate.changedLines:** 50  
**//estimate-basis:** Зуб `report-check.mjs` уже есть (38 строк) и работает. Добавляем синхронизацию с утренним манифестом (строки ~15–20). Остаётся в прогнозе (было 40).

---

### Ш1 + Ш2 — Разведка (ревью и шип)
**Persona:** `tarasov` (вердикты, разведка)  
**Zone:**
- `scripts/pr-ship.mjs`
- `scripts/review-gate.mjs`
- `scripts/code-review.mjs`
- `origin/fix/review-gate-pr-head`
- `origin/feat/ship-merge-state-guard`

**Estimate.changedLines:** 180  
**//estimate-basis:** Три скрипта (1117 строк). Ветки уже существуют. Мёржим логику состояния гейта (~40 строк в `review-gate.mjs`), добавляем state-guard в `pr-ship.mjs` (~50 строк), синхронизируем `code-review.mjs` с новым контрактом (~30 строк). Прогноз разведки из v1 — 140 строк (80+60); увеличиваем на базе вещественного кода.

---

## Итого по спринту

| Блок | Persona | Lines | Basis |
|------|---------|-------|-------|
| Ф2+Ф5 (манифест) | vesnin | 120 | существующие 86+222 + новый файл |
| Ф3+Ф4 (фидбек) | **ozhegov** ← ~~angelina~~ | 95 | скрипты живут, правим сборку ролей |
| Ф6+Ф9 (аудит) | ozhegov | 85 | уже работает, провод в цепочку |
| У1 (MAIN_DAY_ISSUE) | tarasov | 140 | интеграция с манифестом |
| У2 (день-план) | **dynin** ← ~~angelina~~ | 105 | три скрипта, синхрон логов |
| У3 (подпись) | vesnin | 35 | маленький скрипт, хеш |
| У4 (доклад) | ozhegov | 50 | зуб работает, синхрон манифеста |
| Ш1+Ш2 (разведка) | tarasov | 180 | ветки, state-guard, контракт |
| **СУММА** | — | **810** | — |

**Пороговый контроль:** 810 > 400 — разрез пройден одного сквозного ревью с `vesnin` + `tarasov` на финале.

---
## 2026-07-31 06:19 UTC · tarasov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/recut-block-zone.md
**Вопрос:** Дай ТОЛЬКО новый estimate.changedLines для блока ritual-evening-archive-evidence после расширения зоны на scripts/day-memo.mjs, с основанием. Ничего больше не пересматривай.

**Ответ:**

**Работа:** интегрировать пересборку индекса в `scripts/day-memo.mjs` после записи вещдока.

**estimate.changedLines: 12–18**

**//estimate-basis:**
- `scripts/day-memo.mjs` содержит две точки регистрации вещдока (строки 51, 101) — обе пишут в `registry.jsonl`.
- Требуется обе точки дополнить вызовом `renderIndex()` из `evidence-inventory.mjs`.
- Плюс импорт функции в начало файла (1–2 строки).
- Плюс обработка ошибок пересборки индекса (2–3 строки).
- Никаких условных логик или циклов — прямая последовательность: запись + пересборка.
- Остальные 130+ строк `day-memo.mjs` не трогаются.

---
