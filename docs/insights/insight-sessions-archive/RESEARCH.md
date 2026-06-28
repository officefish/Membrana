# Research: Архивация сессий AI-агентов

> Источник: model knowledge (manual) · 2026-06-28
> Perplexity недоступен; использован базовый корпус знаний модели.

---

## Q1 — Landscape

**Запрос:** AI agent session archiving — industry approaches, open-source tooling 2024–2026

**Выжимка:**

- **LangSmith / Langfuse / Helicone** — стандарт де-факто для трассировки LLM: structured run/span/token, persist в Postgres, экспорт JSON. Ориентированы на prompt-инженеров, не на IDE-сессии.
- **OpenTelemetry Semantic Conventions for GenAI** (2024–2025) — emerging standard: span `gen_ai.*` атрибуты; позволяет роутить сессии в любой OTLP-бэкенд (Jaeger, Tempo).
- **Rewind.ai / Limitless** — screen-level record + OCR; storage ~1–5 GB/day; нет нормализованной схемы агентных ходов.
- **Claude Code JSONL** — каждая сессия = JSONL-файл; поле `type: user|assistant|tool_use|tool_result`; стабильный UUID на сессию. Наиболее чистый источник для адаптера.
- **Cursor** хранит состояние в `state.vscdb` (SQLite); история чата — в таблице `ItemTable`. Формат плавает между версиями.
- **Codex** — отдельный CLI; JSON logs в `~/.codex/sessions/`; структура менее документирована.
- Тренд 2025–2026: **session-level provenance** (что агент предложил → что попало в коммит) — активная область исследования в MLOps; производственные решения редки.

**Импликация:** Claude Code — правильная точка входа. LangSmith-стиль span-трассировки — reference для схемы Turn.

---

## Q2 — Fit (Membrana)

**Запрос:** fit с mjs-скриптами, вечерним ритуалом, background-office stateless constraint, VPS RAM

**Выжимка:**

- `ritual:evening` уже имеет шаг `archive:daily-day` — естественная точка вставки `archive:sessions`.
- `.mjs` скрипты — правильный уровень для адаптера; не требует нового сервиса для первой версии.
- `background-office` stateless by design — нарушить инвариант ради persist нецелесообразно; `background-sessions` как новый сервис — чистая option, но создаёт RAM-давление на VPS.
- **Промежуточный вариант:** адаптер пишет JSONL в `docs/sessions/` (git-versionable) или `%APPDATA%/membrana/sessions/` (нет git-шума). Первый вариант ломает репо-гигиену; второй — правильный для MVP.
- Корреляты (`branch`, `HEAD`, `linked_issue`) снимаются стандартным `git rev-parse` — нет внешних зависимостей.

---

## Q3 — Risk

**Запрос:** secret scrubbing correctness, format drift, storage growth, PII

**Выжимка:**

| Риск | Оценка | Митигация |
|------|--------|-----------|
| Секрет проходит фильтр | Высокий | regex + high-entropy detector; обязательный тест на fixture с известными токенами |
| Формат claude-code JSONL меняется | Средний | версионировать поле `agent_version`; adapter fail-open с логом |
| JSONL растёт бесконечно | Низкий | rotation по размеру/возрасту (gzip > 30 дней); ~1–5 MB/день при активной работе |
| PII в диалогах | Средний | scrub = токены и ключи, не контент; PII-в-тексте — ответственность пользователя (явно задокументировать) |
| Cursor `state.vscdb` закрыт | Средний | адаптер через SQL-query известных таблиц; fallback = export из UI |

---

*Источник: model knowledge (manual) · Perplexity fallback не выполнялся*
