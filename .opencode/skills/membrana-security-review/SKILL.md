---
name: membrana-security-review
description: "Pre-merge security review checklist for Membrana, seeded from the standard Anthropic security-review pattern and adapted to the project (secrets handling, package boundaries, no eval/exec in policy constructors, input validation on services). Use before merging a PR that touches auth, services, scripts, deploy, or handles secrets/user input, or when the user says security review, security check, безопасность, or audit before merge. Do NOT use for routine code review (membrana-code-review) or package-boundary-only checks (membrana-client-module-guard)."
---
# Membrana security review

> **Источник (seeded):** базовый чеклист — стандартный паттерн Anthropic security review (downloadable: `.claude` команда `/security-review`, library/plugin). Этот файл — **Membrana-адаптер** поверх него. Демонстрирует: скилл можно «подкачать» и адаптировать, а не писать с нуля.

Канон-референс: `.claude` `/security-review` (pending changes on branch), [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md).

**Владелец:** **Математик (Dynin)** — security вторичный домен. Приёмка — **Teamlead**.

## When to use

- Перед merge PR, который трогает auth, сервисы, `scripts/*`, deploy, секреты или пользовательский ввод.
- Пользователь: «security review», «security check», «безопасность», «аудит перед merge».

## When NOT to use

- Обычное ревью diff'а → `membrana-code-review`.
- Только границы пакетов → `membrana-client-module-guard`.

## Базовый прогон (seeded)

```bash
# downloadable паттерн: ревью pending-изменений ветки
# (Claude Code) /security-review   — или эквивалент из плагина
```

## Membrana-адаптер (чеклист C-SEC)

1. **Секреты:** нет ключей/токенов в коде, диффе, логах; `.env` не закоммичен; см. `membrana-env-secrets-guard`.
2. **Границы пакетов:** нет обхода слоёв (`@membrana/core` без runtime-импортов) — кросс-чек `membrana-client-module-guard`.
3. **No eval/exec:** policy-конструкторы device-board — data-only, без `eval`/динамического кода (канон: exec-free policy wires).
4. **Input validation:** сервисы (`packages/services/*`, `background-*`) валидируют вход; нет доверенного парсинга сырых буферов без границ.
5. **Deploy:** prod-скрипты не печатают секреты; нет хардкода prod-URL/ключей (см. `membrana-deploy-operator`).
6. **Зависимости:** новые deps проверены; `yarn.lock` консистентен (`membrana-yarn-workspace`).

## Output

- Вердикт **PASS / FINDINGS**; для FINDINGS — severity (P0 утечка секрета / RCE → P2 hardening), файл, фикс.
- P0 — блокер merge; фиксируй в описании PR.

## Инвариант

- Скилл — гибрид: базу можно обновлять из downloadable-источника, адаптер (C-SEC) — Membrana-специфичен, держать в синхроне с `ARCHITECTURE.md`.
