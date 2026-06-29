# Insight: Headroom Proxy Server Deploy

**ID:** insight-headroom-server-deploy  
**Status:** in-review  
**Phase:** M2 baseline  
**Date:** 2026-06-29  
**Issue:** #187

---

## Summary

Headroom proxy v0.27.0 запущен и работает. Baseline замер на синтетических вызовах показал **0% компрессии** — ожидаемо, так как тестовые сообщения < 50 слов (порог content_router). Для прохождения M2 gate (≥40% savings на 2/3 выводов) нужен замер через **реальную Claude Code сессию**.

---

## Setup (выполнено 2026-06-29)

1. **Установка зависимостей:** `uv pip install "headroom-ai[proxy]"` в `tools/headroom-venv/`
2. **Запуск прокси:** 
   ```bash
   ANTHROPIC_API_KEY=<key> tools/headroom-venv/Scripts/headroom.exe proxy --port 8787 --log-file ~/.headroom/logs/proxy.log
   ```
3. **Проверка:** `curl --noproxy 127.0.0.1 http://127.0.0.1:8787/livez` → `{"status":"healthy"}`

### Важные gotchas

- `curl`/`urllib` автоматически идут через HTTPS_PROXY (Hiddify:12334) — нужен `--noproxy 127.0.0.1` / `NO_PROXY=127.0.0.1`
- `headroom perf` считает токены *message content*, не полные `input_tokens` из API (system prompt в статистику не включается)
- deps не установлены по умолчанию — `headroom-ai[proxy]` нужно доставить отдельно

---

## Baseline результаты (синтетические вызовы)

| Метрика | Значение |
|---------|---------|
| Requests | 10 |
| savings_pct | 0.0% |
| cache_hit_pct | 0.0% |
| overhead avg | 54ms |
| overhead max | 496ms |
| compression speed | 17k–140k tok/s |
| content_router | все 13 фрагментов < 50 слов → skipped |

**Вывод:** Прокси работает корректно. 0% — не баг, а ожидаемое поведение на коротких синтетических запросах.

---

## M2 Gate

**Цель:** ≥40% token savings на ≥2/3 выводов реальной Claude Code сессии.

**Следующий шаг:**
```bash
# Запустить новую Claude Code сессию через headroom:
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 yarn claude:code

# После сессии (20-30 tool calls):
tools/headroom-venv/Scripts/headroom.exe perf --format json > docs/insights/insight-headroom-server-deploy/proxy-perf-report-real.json
```

**Отчёт:** `proxy-perf-report.json` (baseline synthetic), `proxy-perf-report-real.json` (real session, pending)

---

## Agent runtime attribution

Headroom measurements must be reported as measured traffic by runtime, not as a proxy for all agent
work. Use [`docs/HEADROOM_AGENT_TELEMETRY.md`](../../HEADROOM_AGENT_TELEMETRY.md) and:

```bash
yarn headroom:agent-report --input docs/insights/insight-headroom-server-deploy/proxy-perf-report.json
```

Current synthetic baseline has no client label and is therefore reported as `client=unknown`, not as
Codex. The deterministic fixture
[`agent-telemetry-sample.json`](./agent-telemetry-sample.json) demonstrates the target split:

- `client=claude-code` for Claude Code proxy traffic;
- `client=codex` for Codex context/prompt transforms;
- operational Codex actions outside Headroom are listed separately.
