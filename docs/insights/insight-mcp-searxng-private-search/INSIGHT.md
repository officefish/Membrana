# INSIGHT: SearXNG — приватный keyless веб-поиск для агентов

| Поле | Значение |
|------|----------|
| **ID** | `insight-mcp-searxng-private-search` |
| **Статус** | adopted (внедрение отложено до M3; weight 5.0) |
| **Источник** | `mcp-tooling-consilium` (2026-06-27) |
| **Создан** | 2026-06-27 |

---

## Проблема / наблюдение

Агенты (Cursor / Claude Code) регулярно нуждаются в веб-поиске для ресёрча: DSP-алгоритмы (cepstral smoothing, spectral flux, YAMNet fine-tuning), инфраструктура (Fly.io, Docker, TLS), ночные охоты (`night-hunt` cron). Сейчас поиск завязан на платный Perplexity (Tier 1, API-ключ) или ручной браузер. Нет keyless, приватного варианта без стороннего API.

Kuryokhin (Музыкант) зафиксировал интерес к поиску DSP-материалов через инструмент, который не передаёт фрагменты аудио-контрактов третьим сторонам.

## Гипотеза

Self-hosted SearXNG + MCP-адаптер ([mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng)) даёт агентам keyless приватный поиск без API-ключей. Развёртывается как Docker Compose за 20 минут. Не требует постоянного обслуживания.

Если внедрить — получаем: ресёрч DSP без риска утечки контракта, независимость от Perplexity-quota, дополнительный источник для `night-hunt`.

## Scope (черновик)

- **In scope:** self-hosted SearXNG инстанс (Docker), MCP fragment-конфиг для Cursor/Claude Code, DSP-ресёрч сценарии (Kuryokhin), `night-hunt` cron
- **Out of scope:** замена Perplexity полностью; индексация внутренних документов; передача приватных строк (.env, WAV) в поиск

## Связи

- Консилиум: [`docs/discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md`](../../discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md)
- Спринт (deferred): `mcp-tooling-m3-searxng` в `docs/tasks/registry.json`
- `docs/MCP_INTEGRATION_STRATEGY.md` §5 (Tier 1)
- Репо: https://github.com/ihor-sokoliuk/mcp-searxng

## Вопросы для research (Q1–Q3)

1. **Landscape:** SearXNG + MCP 2025–2026 — best practices self-hosting, production stability, resource footprint; альтернативы (Brave Search API, Kagi Summarizer)
2. **Fit (Membrana):** реальная польза для DSP-ресёрча vs платный Perplexity; сценарии `night-hunt`; интеграция с `DEVELOPER_RHYTHM.md`
3. **Risk:** качество результатов vs платных; обслуживание инстанса; §5 — что можно слать в запрос, что нельзя
