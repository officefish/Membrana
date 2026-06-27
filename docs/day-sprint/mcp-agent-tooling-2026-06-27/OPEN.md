# OPEN: MCP Agent Tooling (2026-06-27)

| Поле | Значение |
|------|----------|
| **Sprint** | `mcp-agent-tooling-2026-06-27` |
| **Kind** | day-sprint (инфраструктурный) |
| **Status** | **active** — M0 закрыт консилиумом |
| **Size** | M |
| **Priority** | ниже product-эпиков (`device-board-server-first` prod-gate первый) |
| **Lead** | Dynin (установка) + Ozhegov (граф-gate) |
| **LGTM** | Vesnin |

**Консилиум:** [`mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md`](../../discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md)  
**Материал:** [`mcp-agent-tooling-consilium-2026-06-27.md`](../../discussions/mcp-agent-tooling-consilium-2026-06-27.md)

---

## Зафиксированные решения (из консилиума)

1. **codebase-memory-mcp** — Tier 0–1, M1 активен. Gate Ozhegov: нет рёбер plugin→plugin.
2. **headroom** — пилот M2, только `logs:parse` + RAG-чанки. `@membrana/core` — вне компрессии. Threshold: экономия ≥40% на 2/3 выводов.
3. **searXNG** — skip, `status: deferred`. Вернуть при запросе product на keyless DSP-ресёрч.
4. **hindsight** — mini-spike за рамками спринта. Vectorize-хостед §5-запрет.
5. Тиры → `MCP_INTEGRATION_STRATEGY.md` §5.
6. Приоритет инфра-трека — ниже product-эпиков.

---

## Phases

| Phase | Task id | Deliverable | DoD / Gate | Status |
|-------|---------|-------------|------------|--------|
| **M0** | `mcp-tooling-m0-consilium` | Консилиум + решения зафиксированы | Этот файл создан; протокол подписан | ✅ |
| **M1** | `mcp-tooling-m1-codebase-memory` | codebase-memory-mcp: бинарь `tools/bin/`, индекс репо, 3 структурных запроса, хук в `rag-evening-index.mjs` | Граф строится; нет рёбер plugin→plugin (Ozhegov LGTM); fallback в `MCP_USAGE.md` | ⏳ |
| **M2** | `mcp-tooling-m2-headroom-pilot` | headroom MCP/wrapper на `logs:parse` + RAG-чанках; таблица before/after токенов | Экономия ≥40% на 2/3 выводов; `@membrana/core` smoke lossless; §5 OK | ⏳ |
| **M3** | `mcp-tooling-m3-searxng` | — | **Deferred** (skip, нет острой нужды) | ⏸ |
| **M4** | `mcp-tooling-m4-hindsight-spike` | — | **Отдельный mini-spike** (не в этом спринте) | ⏸ |
| **M5** | `mcp-tooling-m5-strategy-sync` | `MCP_INTEGRATION_STRATEGY.md` §5 обновлён (тиры codebase-memory + headroom) | Таблица тиров актуальна; `mcp:verify-bootstrap` зелёный | ⏳ |

---

## Не в спринте

- hindsight Vectorize (§5-запрет без self-hosted)
- SearXNG (deferred, не на критическом пути)
- UI/дашборды для любого из инструментов

---

## §5 Конфиденциальность

| Инструмент | Статус |
|------------|--------|
| codebase-memory-mcp | ✅ offline-бинарь, код не уходит |
| headroom | ⚠️ только self-host/локально; не слать WAV, `.env` |
| searXNG | ✅ self-hosted (deferred) |
| hindsight Vectorize | 🔴 запрещён без self-hosted варианта |

---

## Команды (M1)

```bash
# Скачать бинарь (см. https://github.com/DeusData/codebase-memory-mcp)
# Положить в tools/bin/codebase-memory-mcp (добавлен в .gitignore)

# Первичный индекс
./tools/bin/codebase-memory-mcp index --root .

# Структурные запросы (примеры)
./tools/bin/codebase-memory-mcp query "call chain from board gateway to runtime"
./tools/bin/codebase-memory-mcp query "imports from @membrana/core in apps/client"
./tools/bin/codebase-memory-mcp query "HTTP routes lease endpoint response types"
```
