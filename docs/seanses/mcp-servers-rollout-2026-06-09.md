# Консилиум: внедрение MCP-серверов по TZ_MCP_Servers_Membrana

**Повестка:** ознакомиться с [`docs/TZ_MCP_Servers_Membrana.md`](../TZ_MCP_Servers_Membrana.md) и согласовать задачи rollout MCP (Perplexity, Playwright, Glyph, опционально Chrome), связь с GitHub Issues **#50–#54**, приоритет относительно **Single-Node Detection First (#47)**.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Teamlead → Музыкант → Верстальщик → Математик → …

**Источники:** TZ v1.0 (20.05.2026), Issue #50 (bootstrap), #51–#53 (фазы A–C), #54 (acceptance), `docs/ARCHITECTURE.md`, текущий `.cursor/mcp.json` (gitnexus).

**Примечание секретаря:** протокол сформирован локально (API-вызов `yarn consilium` дважды прерывался по таймауту; ключ проверен через `yarn anthropic:smoke`).

---

[Структурщик]: Прочитал ТЗ. Это **инфраструктура разработчика**, не runtime Membrana: конфиги `mcpServers`, секреты вне git, одинаковая структура для Claude Desktop и Cursor. В репозитории уже есть `.cursor/mcp.json` с **gitnexus** — в ТЗ его нет, зато Issue **#51** (фаза A) явно требует gitnexus + Git + Filesystem. Нужно **свести ТЗ и цепочку #50–#54** в один план: bootstrap в git → workstation A → B → C → acceptance.

[Teamlead]: Согласен. MCP не трогает граф `packages/services/*` и не нарушает слабую связанность плагинов. Но **не смешиваем** с центральным фокусом дня: **#47 Single-Node Detection First** остаётся главным. MCP — **параллельный инфраструктурный трек**, не блокирующий merge в `detector-base`. Rollout начинаем **после** или **вне критического пути** gate 1→2, как уже записано в standup.

[Музыкант]: Для моей работы Perplexity полезен при поиске DSP-литературы и свежих API; Playwright — для проверки демо с микрофоном в браузере (не headless CI). Glyph — навигация по `packages/services/detectors/*`, когда появятся четыре пакета. **Chrome MCP** в ТЗ помечен опциональным и опасным (сессии пользователя) — для Membrana **не нужен** на этапе детекторов.

[Верстальщик]: Playwright для меня — a11y-снимки и проверка DaisyUI-тем, не замена unit-тестов. Конфиги MCP **не коммитим с ключами**; в репо только **example** + README со сценариями. Rodchenko просит: в `docs/` короткая таблица «какой сервер для какой задачи», без простыни из ТЗ в корневом README.

[Математик]: Glyph и gitnexus — оба про карту символов; дублирование инструментов допустимо, если роли разные: Glyph — outline по AST, gitnexus — граф зависимостей. Для **benchmark-датасетов** и **чистых math-функций** в `tdoa-service` MCP не обязателен. Критично: **Perplexity не подставлять в CI** — только локально, ключ в менеджере паролей (ТЗ §Этап 2).

[Структурщик]: Issue **#50** — правильная первая задача: `.gitignore` для `.gitnexus/`, шаблон `.cursor/mcp.json` **без секретов**, `docs/claude_desktop_config.example.json`, `datasets/.gitkeep`. Это **не требует** Perplexity billing и не мешает #47. Merge #50 можно **до** фазы B.

[Teamlead]: Принимаю порядок Issues как канон rollout, ТЗ — как **детальный runbook** для исполнителя:

| Фаза | Issue | Содержание |
|------|-------|------------|
| Bootstrap | #50 | Артефакты в git, example configs |
| A | #51 | gitnexus, Git, Filesystem на станции |
| B | #52 | Perplexity + Playwright (ТЗ §4–6) |
| C | #53 | Glyph + правило конфиденциальности |
| Acceptance | #54 | Composite test 7.7 + запись о деплое |

[Музыкант]: Фаза B — когда понадобится **research** по гармоникам/cepstrum или воспроизведение бага в UI. До закрытия контракта `detector-base` Perplexity — **nice-to-have**, не blocker. Playwright ставим в B, но **не в CI** без отдельного ADR (тяжёлый Chromium, flaky).

[Верстальщик]: В #50 добавить в example-конфиг **плейсхолдер** `PERPLEXITY_API_KEY` и комментарий в markdown: «ключ только в локальном env / Claude config». Cursor и Claude Desktop — **один JSON**, как в ТЗ §5. Windows: `cmd /c npx` — зафиксировать в example, у нас Windows в команде.

[Математик]: Glyph (ТЗ §Этап 3): `uv sync` в клоне **вне репозитория** Membrana — путь абсолютный в конфиге. Не тащить glyph как submodule. Acceptance Glyph — «outline символов в директории Membrana» (ТЗ тест 3); для math-пакетов достаточно `packages/core`, `packages/services/detectors`.

[Структурщик]: **mcp-firewall** и **Chrome MCP** — явно **вне скоупа** v1 rollout (ТЗ: firewall отложен; Chrome — только по необходимости). Issue #53 «confidentiality rule» — документ: не отправлять `.env`, ключи, приватные WAV в Perplexity/чаты.

[Teamlead]: Риск: разработчик тратит день на Playwright+Chromium вместо #47. Решение: **владелец MCP-трека** — один человек; **не более 0.5 дня** на фазы A+B до закрытия gate. Фаза C (Glyph) — после bootstrap merge или в конце недели.

[Музыкант]: gitnexus уже в `.cursor/mcp.json`. Фаза A для меня — проверить `gitnexus analyze` на `packages/services/detectors` после scaffold. Если gitnexus не видит workspace — не блокируем, идём в Glyph позже.

[Dynin]: Уточнение по приёмке (#54): три теста из ТЗ §6 — Perplexity (3 источника), Playwright (example.com), Glyph (outline). Плюс **smoke** gitnexus из Issue #51. Результат — **комментарий в #54** + скрин MCP active, не PR в `apps/client`.

[Верстальщик]: Документация после приёмки (ТЗ §8): не дублировать ТЗ целиком — добавить в `docs/` файл **`MCP_USAGE.md`** (сценарии: research, browser check, code nav) и ссылку из `DEVELOPER_RHYTHM.md` в блок «периодически / инфраструктура».

[Структурщик]: Реестр задач: зарегистрировать `mcp-repo-bootstrap`, `mcp-workstation-phase-a/b/c`, `mcp-rollout-acceptance` в `docs/tasks/registry.json` **при старте #50**, не раньше merge. Сейчас Issues есть, registry — проверить синхронизацию при выполнении.

[Teamlead]: Конфликт приоритетов с MAIN_DAY_ISSUE: MCP **#50–#54** остаётся **🟡 backlog**, но **#50 bootstrap** можно взять **между** PR по detector-base, если CI зелёный и diff только `docs/` + `.gitignore` + example json.

[Музыкант]: Perplexity billing — личная карта разработчика; в standup не светим ключ. Для команды — один example и инструкция «получить pplx-…» (ТЗ §2).

[Математик]: Не писать `.mjs` launcher для MCP (ТЗ «Чего НЕ нужно») — клиент сам поднимает stdio. Скрипт `verify-swagger` для office — другой класс задач, не путать.

[Верстальщик]: `.gitignore`: `.gitnexus/`, локальные `claude_desktop_config.json` если копируют в репо по ошибке. `datasets/` — `.gitkeep`; большие WAV не в git (согласовано с DATASET.md scaffold).

[Структурщик]: Зависимости Issues: #50 → #51 → (#52 ∥ можно после 51) → #53 → #54. #52 и #53 не параллелить одному человеку в один день — слишком много runtime (Node + uv + Chromium).

[Teamlead]: Итоговая позиция Teamlead: **внедряем MCP по Issues #50–#54**, ТЗ — исполнительный документ; **не отменяем #47**; Chrome и firewall — **нет**; Perplexity/Playwright/Glyph — **да**, по фазам.

[Музыкант]: Принимаю. Сначала bootstrap, потом gitnexus на детекторах, Perplexity когда упрёмся в literature review.

[Dynin]: Принимаю. Метрика успеха — #54 closed с логами трёх тестов ТЗ + gitnexus smoke.

[Верстальщик]: Принимаю. Example configs и MCP_USAGE.md — в git; секреты — никогда.

[Ozhegov]: Принимаю. Граф пакетов Membrana не меняется; только `docs/` и dot-config шаблоны.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Внедрять MCP по ТЗ? | **Да**, через цепочку Issues **#50 → #51 → #52 → #53 → #54** |
| ТЗ vs Issues | **Issues** — порядок работ; **TZ_MCP_Servers_Membrana.md** — runbook и acceptance-тесты |
| Приоритет vs #47 | **#47 главный**; MCP — инфраструктурный трек, **не блокирует** detector-base |
| Когда стартовать | **#50 bootstrap** — можно сразу (только docs/config); **#51+** — после merge #50 или в окне 0.5 дня вне критического пути |
| Perplexity | **Фаза B (#52)**; ключ локально, billing личный; не в CI |
| Playwright | **Фаза B (#52)**; локальная проверка UI/demo; не в CI без ADR |
| Glyph | **Фаза C (#53)**; клон вне репо, `uv run` |
| gitnexus / Git / Filesystem | **Фаза A (#51)**; уже частично в `.cursor/mcp.json` |
| Chrome MCP | **Не внедрять** на текущем этапе |
| mcp-firewall | **Отложено** (как в ТЗ) |
| Секреты | Example в git; реальные ключи — менеджер паролей / локальный Claude config |
| Документация | После приёмки: **`docs/MCP_USAGE.md`** + ссылка из `DEVELOPER_RHYTHM.md` |
| Приёмка | Issue **#54**: тесты ТЗ §6 + gitnexus smoke; артеfact в комментарии Issue |

## Definition of Done (MCP rollout v1)

- [ ] **#50 merged:** `.gitignore` (`.gitnexus/`), example `.cursor/mcp.json`, `docs/claude_desktop_config.example.json`, без секретов
- [ ] **#51:** Node ≥18, uv, Git; gitnexus analyze/list; Cursor MCP active (gitnexus, Git, Filesystem)
- [ ] **#52:** Perplexity + Playwright в локальном конфиге; три smoke-промпта из ТЗ §6.1–6.2 проходят
- [ ] **#53:** Glyph `uv run … glyph-mcp --help`; правило конфиденциальности в docs
- [ ] **#54 closed:** composite acceptance + скрин/log «active» в MCP settings
- [ ] **`docs/MCP_USAGE.md`** — сценарии для команды
- [ ] **#47 / Single-Node** не сдвинут по срокам из-за MCP

## Следующий шаг

1. Teamlead: подтвердить старт **#50** в ближайшем спринте (или назначить исполнителя infra).
2. Исполнитель: `yarn task:list` → при необходимости зарегистрировать задачи MCP в registry.
3. После merge #50: `yarn task:archive mcp-repo-bootstrap --notes "PR #…"`.

---

*Протокол: 2026-06-09 · slug: mcp-servers-rollout*
