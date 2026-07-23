# ADR-0016: LPC T1 evidence minimum (hashes + params)

- **Status:** Accepted
- **Date:** 2026-07-23
- **Deciders:** owner (ратификация плана llm-calls-house), craft ozhegov
- **Related:** LPC M3b T1; epic `llm-calls-house` #1033; дом `docs/audit/llm-calls/`

## Context

Usage events для code-review/consilium хранили метаданные вызова, но не доказывали
подлинность тел. Полный prompt/response запрещён (T1). Владелец ратифицировал
**доказательный минимум**: hash + параметры + мета, публично зеркалимый через Mintlify.

## Decision

1. Emit опционально несёт `promptSha256` / `responseSha256` / `*Bytes`, `params`,
   `attemptIndex`, `chainLen`, `providerRequestId`.
2. Hash считается в памяти в агенте; сырые тела не пишутся в office/git/Mintlify.
3. Git-дом `docs/audit/llm-calls` — канон снимков; office — live сутки.
4. Запрет полей `prompt` / `apiKey` / `rawResponse` / `messages` / `content` сохраняется.

## Consequences

- Panel day summary не обязан показывать hashes в v1 (поля optional).
- Локальный `cache/` может держать сырьё для отладки — вне контракта истины.
- Полный pin-манифест Mintlify (#823 F4) — out of scope; thin mirror достаточно.
