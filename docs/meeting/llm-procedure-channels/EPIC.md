# EPIC: llm-procedure-channels

> Заседание `llm-procedure-channels` · сборка вердиктов · 2026-07-23  
> BRIEF: [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · ACTIVE: [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)  
> Статус: **РАТИФИЦИРОВАН** владельцем 2026-07-23 («ратифицирую»)  
> Реестр: `llm-procedure-channels` · GH [#1007](https://github.com/officefish/Membrana/issues/1007)  
> Фазы: A [#1008](https://github.com/officefish/Membrana/issues/1008) · B [#1009](https://github.com/officefish/Membrana/issues/1009) · C [#1010](https://github.com/officefish/Membrana/issues/1010) · D [#1011](https://github.com/officefish/Membrana/issues/1011)

---

## Задание (ратифицировано)

Спроектировать контур «процедура → канал LLM» с учётом запросов/токенов за день и
админ-панелью на mmbrn.tech; первые процедуры — code-review и consilium.

## Порядок (M0)

```text
4 → {7 ∥ 1} → {6 ∥ 2 ∥ 5} → {8 ←{1,2} ∥ 3 ←{1,2,5}} → 9
```

## Вердикты

| ID | Тема | Решение | Протокол |
|----|------|---------|----------|
| **P1** | Контракт procedure | `scripts/lib/llm-procedures.json`; kebab id; поля `{id,entryMjs,yarnScript?,title?,meters}`; PR+LGTM; CR+consilium; без id у local-code-review | [m1](../../seanses/llm-procedure-channels-m1-procedure-contract-2026-07-23-2026-07-23.md) |
| **S1** | Scope v1 | Каркас на N; routing+meters только `code-review`, `consilium` | [m2a](../../seanses/llm-procedure-channels-m2a-scope-2026-07-23-2026-07-23.md) |
| **C1** | Control plane | Гибрид: git defaults + office overlay; `.env` только секреты; `effective = overlay ?? default`; resolve+`source` | [m2b](../../seanses/llm-procedure-channels-m2b-control-plane-2026-07-23-2026-07-23.md) |
| **X1** | Шов llm-proxy | Thin catalog в `scripts/lib/`; experimental не import; `.env.llm-proxy` для ключей; enum `anthropic\|openrouter` | [m3a](../../seanses/llm-procedure-channels-m3a-llm-proxy-seam-2026-07-23-2026-07-23.md) |
| **T1** | Телеметрия | Per-call на office; поля+source; tokens nullable; 30d; best-effort emit; без промпта | [m3b](../../seanses/llm-procedure-channels-m3b-telemetry-2026-07-23-2026-07-23.md) |
| **F1** | Fallback | Явная `chain[]`; перебор; STOP; ollama только из chain; attempt=event | [m3c](../../seanses/llm-procedure-channels-m3c-fallback-2026-07-23-2026-07-23.md) |
| **U1** | Agent usage | Sync POST; emit on; opt-out `LLM_USAGE_EMIT=0`; uuid dedupe | [m4a](../../seanses/llm-procedure-channels-m4a-agent-usage-2026-07-23-2026-07-23.md) |
| **V1** | Панель | `apps/panel` @ panel.mmbrn.tech; owner-only; summary + chain editor + source | [m4b](../../seanses/llm-procedure-channels-m4b-panel-2026-07-23-2026-07-23.md) |
| **R1** | Готовность спринта | Фазы A–D; DoD = wire+office+panel+ручной openrouter-сценарий | [m5](../../seanses/llm-procedure-channels-m5-sprint-ready-2026-07-23-2026-07-23.md) |

## Фазы исполнения (R1)

| Фаза | Карточка | Содержание | DoD фазы (одна строка) |
|------|----------|------------|------------------------|
| **A** | `lpc-a-lib` #1008 | registry, defaults, provider catalog, resolve, transport/chain/emit stubs + JSON schema | unit-тесты lib зелёные |
| **B** | `lpc-b-wire` #1009 | wire `code-review` + `consilium` | оба ходят в resolve/chain/emit на git defaults |
| **C** | `lpc-c-office` #1010 | office overlay + usage ingest/aggregate | API + ручной curl/агент emit |
| **D** | `lpc-d-panel` #1011 | panel owner page | summary + edit chain + badge source |

**Несущий сценарий v1:** при недоступном Anthropic owner ставит chain с openrouter → `yarn code-review` (или uncommitted) завершается → событие видно на панели.

## Out of v1

Ally UI · FreeModel в enum · тихий ollama · auto-scan процедур · offline JSONL flush · новый SPA · cabinet.

## Аудит

Аудитор контейнера — **отдельный** агент (S-M5), post-hoc по ACTIVE/протоколам.
