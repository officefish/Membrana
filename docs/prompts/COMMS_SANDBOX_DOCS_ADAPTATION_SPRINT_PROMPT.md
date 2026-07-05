# Sprint prompt: Адаптация партнёрских документов песочницы (CD1–CD6)

| Поле | Значение |
|------|----------|
| **Sprint** | `comms-sandbox-docs-adaptation` |
| **Тип** | Doc-адаптация (не имплементация скиллов/хука/MCP) |
| **Базовые доки** | `docs/comms/sandbox/{RUNBOOK_AGENT_SETUP,CHECKLIST_PARTNER_MANUAL_SETUP,INSIGHT_MCP_INTEGRATIONS,GUIDE_SKILLS_DEPLOYMENT}_COMMS_SANDBOX.md` |
| **Опора реализации** | Спринт `comms-contour-environment` (CC1–CC9, archived) + INSIGHT `insight-comms-contour-topology` (Вариант A) |
| **Size** | M (6 задач) |

> **Рамка (владелец):** наш спринт CC1–CC9 — **источник истины**; реализация приоритетнее того, что
> написано в доках. НО сами доки важны — по ним **действует партнёр** (нетехническая роль). Адаптация =
> привести доки в соответствие с реализацией, **не потеряв их ценность** как операционного runbook/чеклиста,
> а не выбросить и не переписать с нуля. Базовые версии закоммичены как pre-adaptation baseline —
> задачи правят их in-place, дифф показывает адаптацию.

## Что уже реализовано (реальность, к которой адаптируем)

- Топология — **Вариант A**: leaf-воркспейс `apps/comms-studio` в монорепо (`github.com/officefish/Membrana`).
- Канон **живёт в репо и читается живьём**: Слой 3 `docs/comms/canon/{FACTS_SHEET,GLOSSARY,BRAND_TOKENS}.md`
  (наполнены, CC5–7); Слой 1–2 — `docs/foundation/*`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS_STRATEGY.md`,
  `docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`.
- Детерминированный guard запрещённых слов **уже реализован**: `apps/comms-studio/src/tone-guard.ts`
  (`checkTone`) + `out-writer.ts` (блок на записи). blocked-terms источник — `GLOSSARY.md §3`.
- Инвариант «сток не исток» держится **по построению**: `check:boundaries` (CC2), запись только в `out/`,
  secret-scan (CC4), отдельная CI-полоса (CC3).
- Первый выход + seam-генератор: `apps/comms-studio/src/generator.ts`, `generate:v0.1` → `out/v0.1/`.

## Задачи

### CD1 — Зафиксировать топологию (Вариант A)
- [ ] RUNBOOK §0: `CONTOUR_DIR=apps/comms-studio`, `REPO_URL=github.com/officefish/Membrana`; убрать
  «до решения — согласуй, не выбирай сам» (решение принято, INSIGHT adopted).
- [ ] INSIGHT_MCP §2.28 «как в брифе по топологии» → сослаться на принятый Вариант A.
- [ ] Сверить, что размещение `.claude/skills/` контура согласовано с leaf-воркспейсом.

### CD2 — Живой канон вместо копий (центральная задача)
- [ ] RUNBOOK §5.1: filesystem-MCP scope → `docs/comms/canon/` **+** Слой 1–2 (`docs/foundation/`,
  `docs/ARCHITECTURE.md`, …), не `$CONTOUR_DIR/canon`.
- [ ] RUNBOOK §6 / GUIDE §3, §8: `references/*` скиллов **указывают на живой** `docs/comms/canon/`,
  не хранят копии; blocked-terms = `GLOSSARY.md §3` (не отдельный сочинённый файл).
- [ ] CHECKLIST Блок C: три канон-файла **уже готовы** (CC5–7) → пункт = «подтвердить/указать на готовое»,
  не «сочинить с нуля». Явно перечислить пути.
- [ ] INSIGHT §4: канал «Канон» = `docs/comms/canon/` (read-only), single source.

### CD3 — Hook переиспользует наш guard
- [ ] RUNBOOK §7 / INSIGHT §3.3 / GUIDE §5: детерминированный барьер запрещённых слов **уже есть**
  (`apps/comms-studio/src/tone-guard.ts`). Хук партнёра **переиспользует** список/логику
  (`GLOSSARY §3` + `tone-guard`), не дублирует. Эмпирический тест «блокирует, а не помечает» — сохранить.

### CD4 — Связь песочницы и seam-генератора
- [ ] Добавить раздел (в INSIGHT_MCP или новый): интерактивная песочница Claude Code ↔ детерминированный
  `generate:v0.1` seam. Оба читают **один** канон (`docs/comms/canon/`), пишут **только** в `out/`.
  Наш генератор — воспроизводимый baseline; интерактивный агент — рабочий фронт партнёра.

### CD5 — Точность и сверка ссылок
- [ ] Node: обосновать 22 vs репо-20 (CI/`@types/node` = 20) — выровнять или зафиксировать причину.
- [ ] Плейсхолдеры: даты, `<официальный remote-URL Replit MCP>`, имя пакета Playwright MCP — пометить
  как «сверить перед запуском» (не выдумывать URL).
- [ ] Проверить существование ссылок GUIDE §6: `PROMPT_PITCH_DECK.md`, каноническая структура `membrana.space`;
  отсутствующие — заглушить `[TBD]`, не выдумывать.

### CD6 — Размещение и регистрация
- [ ] Финализировать размещение 4 доков в `docs/comms/sandbox/`; cross-link из
  `insight-comms-contour-topology` и `docs/comms/` индекса.
- [ ] Сквозная сверка 4 доков между собой (топология, канон-пути, число серверов=4, скиллов=9, инвариант).

## Non-goals
- **Не** имплементировать 9 скиллов, хук, MCP-конфиг (это setup партнёра по runbook; отдельное решение).
- **Не** менять сам контур `apps/comms-studio` (реализация закрыта CC1–CC9).
- **Не** трогать деплой боевого лендинга (stage-gate).

## Definition of Done
- Все 4 дока внутренне и взаимно согласованы с реализацией CC1–CC9 (Вариант A, живой канон, наш guard).
- Ни одной выдуманной цифры/URL/имени; отсутствующее — `[TBD]`.
- Инвариант «сток не исток» и «из песочницы выходят только файлы» сохранён во всех доках.
- Партнёр может действовать по CHECKLIST + RUNBOOK без противоречий с репозиторием.
