# Протокол консилиума: MCP Agent Tooling (2026-06-27)

> **Материал:** [`mcp-agent-tooling-consilium-2026-06-27.md`](./mcp-agent-tooling-consilium-2026-06-27.md)  
> **Результат:** спринт `mcp-agent-tooling-2026-06-27`, активные фазы M0–M2, M5

---

## Голоса участников

### Vesnin / Teamlead

Инфра-трек не конкурирует с `device-board-server-first` prod-gate — тот идёт первым сегодня после обеда.

- **codebase-memory-mcp** — беру без колебаний. Offline-бинарь, MIT, никуда не течёт. 120× экономия токенов на навигации — прямой удар по боли с `registry.json` 9000 строк в контексте. M1, Tier 0–1.
- **headroom** — пилот M2 одобряю. Жёсткое ограничение: только `logs:parse` + RAG-чанки. `@membrana/core` — вне компрессии. Dynin замеряет before/after на трёх выводах, иначе нет LGTM.
- **searXNG** — skip сейчас. Perplexity закрывает нишу. Если product запросит keyless DSP-ресёрч — вернёмся в следующий спринт.
- **hindsight** — спайк M4 за рамками этого спринта. Vectorize-хостед запрещён (§5). Self-hostable — исследовать отдельно, lean в сторону «не нужен».

Приоритет спринта: **ниже product-эпиков**. Dynin + Ozhegov ведут параллельно фоном.

### Ozhegov / Структурщик

codebase-memory-mcp — инструмент для моих задач: cross-service links, проверка «нет рёбер plugin→plugin».

**Gate M1:** граф строится без ошибок, первый запрос подтверждает отсутствие прямых рёбер plugin→plugin. Если есть — отдельный Issue на дефект архитектуры.

headroom: **контракты `@membrana/core` не сжимать**. DoD M2 включает явный smoke: `packages/core/src/index.ts` через headroom → все публичные типы читаются без потерь.

Тиры пишем в `MCP_INTEGRATION_STRATEGY.md` §5 (существующая таблица), не создаём новый файл.

### Dynin / Математик

Беру техническую часть M1:
1. Бинарь `codebase-memory-mcp` → `tools/bin/` + `.gitignore`
2. Первичный индекс репо, зафиксировать время
3. Хук в `rag-evening-index.mjs` — инкрементальный граф-апдейт после RAG
4. Три структурных запроса: call-chain `board.*`→`runtime.*`, импорты `@membrana/core` в `apps/client`, HTTP-routes lease → типы ответа

headroom M2: таблица before/after. Метрика — токены (tiktoken или по символам). Три вывода: `logs:parse`, RAG-чанк, smoke-матрица. Если экономия <40% на 2/3 — пилот провален, откладываем.

SearXNG — технически поднять легко, но раз skip — согласен. `status: deferred` в registry.

M4 (hindsight-спайк) — за рамки текущего спринта, нужна неделя не день.

### Kuryokhin / Музыкант

Аудио-контур не затронут. Если searXNG поднимется в будущем — хочу использовать для DSP-ресёрча (cepstral smoothing, spectral flux, YAMNet). Возражений нет.

### Rodchenko / Верстальщик

UI в спринте нет. Если hindsight получит дашборд — отдельная задача с дизайн-ревью, не в M4-спайке. Нейтрально, блокирующих замечаний нет.

---

## Решения (зафиксированные)

| # | Вопрос | Решение | Принял |
|---|--------|---------|--------|
| 1 | Берём ли codebase-memory-mcp? | **ДА**, M1, Tier 0–1. Gate: нет рёбер plugin→plugin | Vesnin + Ozhegov |
| 2 | headroom — пилот сейчас? | **ДА**, M2; только `logs:parse` + RAG-чанки; `@membrana/core` вне компрессии; экономия ≥40% на 2/3 | Vesnin + Dynin |
| 3 | searXNG — в спринт? | **Skip** → `status: deferred`. Вернуть при запросе product на keyless DSP-ресёрч | Vesnin |
| 4 | hindsight — отдельный слой памяти? | **Mini-spike за рамками спринта**. Vectorize-хостед — §5-запрет | Vesnin + Dynin |
| 5 | Куда писать тиры? | В `MCP_INTEGRATION_STRATEGY.md` §5, существующая таблица | Ozhegov |
| 6 | Приоритет спринта | **Ниже product-эпиков**; параллельно фоном | Vesnin |

---

## Спринт

**id:** `mcp-agent-tooling-2026-06-27`  
**Активные фазы:** M0 → M1 → M2 → M5  
**Отложено:** M3 (deferred) · M4 (mini-spike отдельно)  
**Lead:** Dynin (установка) + Ozhegov (граф-gate) · **LGTM:** Vesnin
