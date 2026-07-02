# Epic: Tailwind coverage hardening (monorepo multi-app)

**Epic id:** `tailwind-coverage-hardening`
**Основание:** консилиум `docs/seanses/deploy-friction-consilium-2026-07-02.md`
**Триггер:** cabinet-фикс вёрстки device-board уехал в прод сломанным, потому что
`apps/cabinet/tailwind.config.js` `content` не сканировал `packages/device-board`+`core`
(client работал, cabinet — нет). Вердикт консилиума: **не архитектурный долг**, а
естественный порог сложности monorepo → нужна **операционная защита** (документация +
генерация + CI-гейт), без переструктуризации (device-board правильно headless).

## Phase L1 — package README frontmatter (немедленно)

**Lead:** Rodchenko (Верстальщик) · **Size:** S

- В `README.md` каждого UI-пакета (`packages/device-board`, `packages/core` если есть CSS,
  `packages/libs/journal-report-views`, `packages/libs/audioDataViz`, и т.п.) — секция:
  ```markdown
  ## Tailwind Integration

  <!-- tailwind-content: ["./src/**/*.{ts,tsx}"] -->
  ```
- Машиночитаемый комментарий — источник правды для генератора (L2).

**DoD L1:** UI-пакеты содержат `## Tailwind Integration` с `tailwind-content` фронтматтером;
`apps/cabinet/tailwind.config.js` уже содержит нужные пути (сделано в `cabinet-device-board-tailwind-fix`).

## Phase L2 — generator + CI gate + skills (спринт)

**Lead:** Kuryokhin (Музыкант) + Dynin (Математик, CI-гейт) · **Size:** M

- `scripts/generate-tailwind-configs.mjs` — рекурсивно обходит граф `@membrana/*`
  зависимостей каждого app, собирает транзитивные `tailwind-content` из README пакетов,
  генерирует `apps/{client,cabinet}/tailwind.config.js` `content`. Тесты.
- `yarn build:pre-gen` (или интеграция в build:client/build:cabinet) вызывает генератор.
- CI-гейт `yarn verify:tailwind-coverage` — падает, если repo-конфиг ≠ сгенерированному
  ИЛИ импортируемый UI-пакет не покрыт `content`. Включить в `test:scripts` (CI гоняет).
- `CONTRIBUTING.md` — секция «Multi-app Tailwind Setup» для новых приложений.

### L2 доп-требование: скиллы для трёх агентов (по запросу пользователя)

На основе скриптов создать **скилл tailwind-coverage** для всех трёх агентов, чтобы
конвенция соблюдалась автоматически при добавлении UI-пакета/приложения:

- **Cursor:** `.cursor/skills/membrana-tailwind-coverage/SKILL.md` (канонический).
- **Claude Code:** `.claude/skills/membrana-tailwind-coverage/` (тонкое зеркало → cursor).
- **Codex/OpenCode:** `.opencode/skills/` (+ при необходимости `.opencode/command/`).

Скилл: когда добавляешь UI-пакет — добавь `## Tailwind Integration` фронтматтер; перед
prod-деплоем/сборкой запусти `yarn verify:tailwind-coverage`; на fail — `yarn build:pre-gen`.

**DoD L2:** генератор + тесты; `verify:tailwind-coverage` в CI (`test:scripts`); CONTRIBUTING;
скилл в `.cursor/skills`, `.claude/skills`, `.opencode/skills`; на следующем cabinet-деплое
недосканированных утилит нет.

## Out of scope

- Архитектурный рефакторинг device-board/cabinet (консилиум: не требуется).
- CI-gate гранулярность / флейки-тесты (пункт Б) — **отдельный консилиум после спринта**.
