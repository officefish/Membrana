<!-- Консилиум: 2026-06-26 · тема: OpenCode operator skills wave 2 · следствие Issue #183 -->

# Консилиум: какие ещё OpenCode-скиллы ставить (wave 2)

> Протокол виртуальной команды по [`CONSILIUM_PROMPT.md`](../prompts/CONSILIUM_PROMPT.md). Вход — предложения координатора (5 скиллов) + идеи ролей. Цель — сойтись на scope spринта и приоритетах. Конфликт решает **Teamlead + ARCHITECTURE.md**.

Контекст: после #183 в `.opencode/skills/` 25 скиллов. Вопрос постановщика: что ещё стоит добавить, и обязательно ли скиллы оборачивают наши `yarn`-скрипты, или их можно «подкачать».

---

## Раунд 1 — рамка и предложения

[Teamlead — Vesnin]: Рамка. Скилл бывает трёх видов: (1) *операторский* — обёртка одного `yarn`-скрипта; (2) *плейбук* — чистое знание/чеклист без скрипта; (3) *обёртка внешнего инструмента/MCP* (`gh`, `docker`, Linear). Все три легитимны; не каждый скилл обязан звать наш скрипт. «Подкачать» можно: `SKILL.md` — переносимый формат Anthropic Agent Skills (плагины, маркетплейсы, библиотека Anthropic, `skill-creator`), но generic-скилл почти всегда требует тонкого адаптера под наши пути. Координатор предложил пять: `deploy-operator`, `git-pr`, `yarn-workspace`, `linear-sync`, `security-review`. Прошу каждого — за/против и свои.

[Структурщик — Ozhegov]: Поддерживаю `git-pr` в первую очередь — сегодня мы вручную собирали scoped-коммит, разруливали `index.lock`, отделяли спринт от грязного дерева. Это повторяемая боль → плейбук + `gh`/lefthook: ветки `vesnin`/`ozhegov`/`techies68`, scoped-stage по сигнатуре диффа, запрет коммитить `.env`/логи в корень. Тип — плейбук, наш скрипт не нужен (кроме `lefthook`).

[Математик — Dynin]: Деплой и безопасность — мой вторичный домен, беру. `deploy-operator` обязателен: скриптов prod-деплоя десятки (`cabinet:*:prod`, `device-board:deploy:prod`, `office/media docker prod`), а скилла-навигатора нет — оператор теряется, какой скрипт для какого сервиса. Тип — операторский (обёртка реальных скриптов). Добавлю `env-secrets-guard`: сегодня RAG не пошёл из-за ключа/localhost-прокси — нужен скилл про `.env`, `HTTPS_PROXY`, какие ключи где, и «секреты не в репозиторий». Это плейбук + guard.

[Музыкант — Kuryokhin]: Мой аудио-контур тут сбоку, но по вторичной компетенции (embedded/edge) вижу нишу: `edge-capture-deploy` — прошивка/захват на RPi/STM32. Честно — это редко, предлагаю **defer** в Tier 2, чтобы не раздувать спринт.

[Верстальщик — Rodchenko]: От UI-домена — `design-review` скилл (чеклист по `DESIGN.md` + `LIVE_DETECTION_UI.md`: сглаживание isDrone/confidence, h-full без прыгающего scrollbar, a11y). Полезно, но не горит — Tier 2. По форме новых скиллов настаиваю: единый шаблон (When to use / When NOT / Commands / workflow), описания с триггерами **и** «Do NOT use», иначе ложные срабатывания.

---

## Раунд 2 — дебаты и приоритеты

[Teamlead — Vesnin]: Слышу риск skill-sprawl. 25 скиллов — уже много; добавляем только то, что снимает реальную боль. Голосуем по Tier 1 (этот спринт) vs Tier 2 (follow-up).

[Математик — Dynin]: `yarn-workspace` — за, но компактно: gotchas (corepack→Yarn4, `--immutable`, turbo `^build` граф) уже в `AGENTS.md` §Gotchas. Скилл нужен только чтобы это автоматически триггерилось при ошибках установки/сборки. Маленький плейбук, не дублировать AGENTS.md, а ссылаться.

[Структурщик — Ozhegov]: Согласен. И предлагаю **слить** `docker-ops` в `deploy-operator` — отдельный docker-скилл плодит границу с деплоем. Один operator-скилл со секцией «docker prod build/up».

[Математик — Dynin]: Принимаю слияние. По `security-review`: это классический *downloadable* кандидат — берём базовый чеклист из библиотеки Anthropic (или плагина security-review) и адаптируем под Membrana (границы пакетов, секреты, отсутствие eval в policy-конструкторах). Покажем постановщику, что «подкачка» работает на живом примере.

[Верстальщик — Rodchenko]: Тогда `security-review` — гибрид: seeded извне + наш адаптер. Это хорошая демонстрация всех трёх типов скиллов в одном спринте.

[Teamlead — Vesnin]: `linear-sync` — нужен? У нас `LINEAR_GITHUB_SYNC_REGULATION.md` есть, но Linear неблокирующий. 

[Структурщик — Ozhegov]: Понизил бы до Tier 2 — пока GitHub Issues + registry достаточно; Linear-скилл оформим, когда реально включим Linear в поток.

[Математик — Dynin]: Согласен, Tier 2. Не оборачивать то, чем не пользуемся ежедневно — иначе мёртвый скилл.

[Музыкант — Kuryokhin]: Подтверждаю `edge-capture` → Tier 2. В Tier 1 не лезу.

[Верстальщик — Rodchenko]: `design-review` тоже Tier 2 — UI-волна сейчас не активна.

---

## Раунд 3 — сходимость

[Teamlead — Vesnin]: Фиксирую Tier 1 (5 скиллов) этого спринта:
1. `membrana-git-pr` — плейбук + `gh`/lefthook (scoped commit, ветки, no-secrets).
2. `membrana-deploy-operator` — операторский, навигатор по prod-деплою (+ docker секция).
3. `membrana-yarn-workspace` — компактный плейбук (corepack/immutable/turbo), ссылка на AGENTS.md.
4. `membrana-security-review` — гибрид: seeded из downloadable + Membrana-адаптер.
5. `membrana-env-secrets-guard` — плейбук + guard (`.env`, прокси, ключи, секреты не в репо).

[Структурщик — Ozhegov]: Раскладка: все под `.opencode/skills/membrana-*`, формат как у эталона, описания с границами. Mirror в `.cursor`/`.claude` — Tier 2 (как и для #183). C-scope чистый.

[Математик — Dynin]: Инвариант: операторские скиллы (`deploy-operator`) — только обёртки существующих скриптов, dangling = 0. Плейбуки — без выдуманных команд. Verify: `deploy-operator` ссылается только на реально существующие `package.json` скрипты.

[Верстальщик — Rodchenko]: Каждый SKILL.md проходит чеклист читаемости: триггеры в description, «Do NOT use → сосед-скилл», таблица команд. `git-pr` обязан явно сказать «не коммить `.env`/deploy-логи в корень» (это уже в CLAUDE.md).

[Музыкант — Kuryokhin]: От меня — пусто по Tier 1, поддерживаю состав. Tier 2 (`edge-capture`, `design-review`, `linear-sync`, `docker-ops` если разрастётся) — отдельной волной.

[Teamlead — Vesnin]: **Консенсус.** Tier 1 = 5 скиллов выше. Спринт `opencode-operator-skills-wave2-2026-06-26`, фазы `wc-c0..c4`. Ответ постановщику на «обязательно ли наши скрипты»: **нет** — в Tier 1 один операторский (обёртка), три плейбука, один гибрид (downloadable + адаптер). Tier 2 — defer. Реализацию начинаем после go от постановщика по scope.

---

## Итог (для плана спринта)

| # | Скилл | Тип | Опора |
|---|-------|-----|-------|
| 1 | `membrana-git-pr` | плейбук + tool | `gh`, `lefthook`, ветки персонажей |
| 2 | `membrana-deploy-operator` | операторский | `cabinet:*:prod`, `device-board:deploy:prod`, `*:docker:prod:*` |
| 3 | `membrana-yarn-workspace` | плейбук | `AGENTS.md` §Gotchas, corepack/turbo |
| 4 | `membrana-security-review` | гибрид (downloadable+адаптер) | библиотека Anthropic + Membrana-границы |
| 5 | `membrana-env-secrets-guard` | плейбук + guard | `.env`, `HTTPS_PROXY`, ключи (RAG/Anthropic/Linear) |

**Tier 2 (follow-up wave):** `membrana-linear-sync`, `membrana-design-review`, `membrana-edge-capture`, mirror в `.cursor`/`.claude`.

**Вердикт Teamlead:** scope утверждён командой; ждём go постановщика перед реализацией.
