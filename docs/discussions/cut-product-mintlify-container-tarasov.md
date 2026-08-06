# Обсуждение: cut-product-mintlify-container-tarasov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 09:50 UTC · tarasov

**Контекст:** docs/local-sprint/product-mintlify-container-2026-08-02/OPEN.md
**Вопрос:** Проверь нарезку docs/sprint/cut/product-mintlify-container-2026-08-02.json после machine finding: Product/Harness граница, четыре accountable-блока, непересечение зон, живой тарифный канон и достаточность review. Дай LGTM или BLOCK с точными изменениями.

**Ответ:**

## Положение

Нарезка **product-mintlify-container-2026-08-02** нарушает важное — смешивает Product и Harness в одном спринте без чёткого разделения и оставляет критическую дыру в тарифном конвейере.

## Вердикт

**BLOCK.** Три причины, поправляются в согласовании с вами и Веснином.

---

## Конкретные потребления

### 1. **Boundary Product ↔ Harness размыта**

Из задачи видно:
- `product-surface` (rodchenko) отвечает за `apps/docs` навигацию.
- `harness-workflow-pages` упомянута как **отдельная**, но сейчас в нарезке её нет.
- `apps/docs-harness` существует отдельно, но непонятно: входит ли она в **этот** спринт или ждёт второго?

**Нужно уточнить:**
- Берём ли мы `apps/docs-harness` в scope сейчас или она остаётся вне?
- Если вне — явно исключить из нарезки и заморозить на реестре.
- Если в scope — добавить её как четвёртый accountable-блок с владельцем.

---

### 2. **Тарифный канон не привязан к исполнению**

- `tariff-projection` (dynin) генерирует MDX из `docs/tariffs/*.json`.
- Но **где live-испытание**? Генератор должен:
  - Прогнать **unit-тесты** на парсе обоих JSON.
  - Выдать **check-mode** вывод (сгенерированная MDX без публикации).
  - Быть **воспроизводим**: `yarn tariff:generate --check` должен пройти на любом ноутбуке.

**Требование к нарезке:**
- Добавить `tariff-projection:unit` и `tariff-projection:check-mode` в блок.
- Результаты (`generated/*.mdx` или лог `--check`) — в artifacts для review.

---

### 3. **Review-gate неполный**

Из нарезки:
- `sprint:gate` есть.
- Но **где профильные checks** для каждого блока?

Нужны:

| Блок | Профильный check |
|------|------------------|
| `product-surface` | Mintlify-build (no errors), link-check на Product nav, mobile viewport test |
| `tariff-projection` | Unit-test pass, `--check-mode` deterministic, diff preview vs. current |
| `integration-and-gates` | Registry consistency, branch SHA, closure journal |

**Без них** gate — мёртвая бумага.

---

## Что исправить

### Минимально (позволю пройти, если согласитесь):

1. **Явно определить**: Product-Harness в этом спринте или раздельно?
2. **Дополнить `tariff-projection`**:
   - Unit-тесты на `tariff-grid.json` + `tariff-scalars.json` парсе.
   - CLI: `yarn tariff:generate --check` (no-op run).
   - Artifacts: сгенерированный MDX в pull-artifacts для code-review.
3. **Добавить профильные checks** в gate-блок (Mintlify-build, link-check, tariff determinism).

### Максимально (правильно, но требует согласования):

- Разделить на **два отдельных спринта**:
  - Этот: **product-mintlify-container** (Product только, без Harness).
  - Следующий: **harness-workflow-pages** (Harness, с нарезкой мастерских).
- Каждый со своим реестром и closure-journal.

---

## Уточняющие вопросы

1. **Harness в scope?** Если да — кто владелец блока `harness-workflow-pages`? Если нет — удаляем из нарезки.
2. **Тарифный конвейер ready?** Можно ли сейчас запустить `yarn tariff:generate --check` без ошибок, и есть ли unit-тесты на парсер JSON?

**Жду ответа — потом даю финальный вердикт.**

---
## 2026-08-02 09:51 UTC · tarasov

**Контекст:** docs/local-sprint/product-mintlify-container-2026-08-02/OPEN.md
**Вопрос:** Повторная проверка после BLOCK: Harness явно вне cut и заморожен до второго спринта; tariff JSON исключены из write-zone; accountable blocks теперь четыре с отдельными Mintlify/link/mobile, unit/deterministic check/diff, registry sync и exact-SHA checks. Дай финальный LGTM или назови оставшийся BLOCK.

**Ответ:**

Положение: cut повторно проверена, accountable blocks переструктурированы с явным разделением зон ответственности и гейтов. Harness заморожен, tariff JSON в read-only, scope сужен до Product-контейнера.

Решение: Ок. Граммем чистая, механика завязана. Три замечания перед LGTM:

1. **Гейт `product-surface` (rodchenko).** Пункт «Mintlify validation» — нужна явная чек-лист: конфиг `mint.json` валиден? Links resolved (не 404)? Mobile viewport на типовых брейкпоинтах рендерится? Иначе «validation» останется расплывчато.

2. **Гейт `tariff-projection` (dynin).** Пункт «deterministic `--check`» — это `yarn tariff:check`? Выход должен быть бинарный (exit 0 / exit 1) и воспроизводимый. Если есть timestamp или random-генерация — зашумит. Убедись, что seed/NOW зафиксированы.

3. **Registry drift.** Ты пишешь «registry/README sync без drift». Где живёт источник истины? `task-contract` пишет в `docs/sprint/...` или в инструмент Linear? Если инструмент — дай конкретный поиск (например, label `product-mintlify-container`), чтобы auditor после закрытия спринта мог свериться.

Два первых — не блокеры, если они зашиты в промпт `PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`. Третий — блокер, если registry остаётся интерпретируемым.

**LGTM условно:** дай мне одну строку на каждый пункт (где чек-лист живёт, какая команда запускает `check`, источник истины для drift-контроля). После — печать.

---
## 2026-08-02 09:52 UTC · tarasov

**Контекст:** docs/local-sprint/product-mintlify-container-2026-08-02/OPEN.md
**Вопрос:** Финальная печать после условного LGTM: три точных носителя добавлены в OPEN — Product checklist в дочернем prompt DoD, deterministic бинарный node scripts/product-docs-tariffs.mjs --check без времени/random/сети, registry source docs/tasks/registry.json с task-list --sync-readme --check и tasks-decompose. Дай финальный LGTM или BLOCK.

**Ответ:**

Положение ясно: три носителя условий присоединены к спринту, инструменты именованы, точки проверки зафиксированы в OPEN.

Перед LGTM — три уточняющих вопроса:

1. **Product checklist в prompt DoD** — это новая секция в `PRODUCT_MINTLIFY_CONTAINER_PROMPT.md` или расширение существующей? Нужна ссылка на конкретную строку файла, чтобы Структурщик видел, где именно фиксируется обязательность.

2. **node scripts/product-docs-tariffs.mjs --check** — скрипт уже существует или его нужно написать в рамках `tariff-projection` блока? Если существует — SHA и статус (passing/failing на текущем main)?

3. **docs/tasks/registry.json как source** — это единственный источник истины для всех трёх проверок (registry drift, README sync, decompose), или decompose питается отдельным файлом? Уточни порядок: registry → автогенерация README → decompose проверяет чистоту категоризации?

После ответов — вердикт.

---
## 2026-08-02 09:53 UTC · tarasov

**Контекст:** docs/local-sprint/product-mintlify-container-2026-08-02/OPEN.md
**Вопрос:** Ответы внесены в OPEN: checklist уже в конкретной секции Definition of Done дочернего prompt; tariff CLI ещё не существует и является честно названным выходом блока, а не passing-фактом; поток registry -> generated README, а decompose читает registry плюс отдельный category config. Дай теперь только финальный LGTM или конкретный BLOCK без новых уточняющих вопросов.

**Ответ:**

**ПОЛОЖЕНИЕ.** Cut принял свежую нарезку, конкретизированы три кроссовых гейта и honest-gap по тарифному CLI. Registry → README → decompose чекнул. Definition of Done вложен в дочерний prompt, не тянет новые уточнения.

**РЕШЕНИЕ.** Зелёная сигнализация по существу. Три условия на месте: сложность (мультимодальная синхронизация docs/tariffs/registry), связка (rodchenko/dynin/vesnin без одиночников), нагрузка (гейт-цепь и journal до закрытия).

**СВЯЗКА.**
- rodchenko — `product-surface` (видимость, link-check, viewports).
- dynin — `tariff-projection` (детерминированный генератор, `--check`, diff).
- vesnin — `task-contract` (registry sync, decompose, prompt consistency).

**ВЕРДИКТ.** **LGTM**. Sprint ready. Ветка `codex/product-docs-container`, SHA ожидается в замыкающем journal-run. Harness остаётся frozen по плану; второй PR после закрытия Product.

---
