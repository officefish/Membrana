---
name: membrana-code-review
description: >-
  Membrana code review ritual v0.2: tiers T0/T1/T2, severity P0–P2, yarn code-review modes
  (daily evening, PR, branch, uncommitted), output paths, LGTM/BLOCK format. Use when user asks
  for code review, вечернее ревью, PR review before merge, Teamlead LGTM on diff, or yarn
  code-review. Do NOT use for Bugbot/security-only scans (review-bugbot, review-security) or
  morning standup (read DAILY_CODE_REVIEW.md only — membrana-developer-rhythm).
---

# Membrana code review (v0.2)

Канон: [`docs/prompts/CODE_REVIEW_REGULATION.md`](../../../docs/prompts/CODE_REVIEW_REGULATION.md) · консилиум: [`docs/discussions/code-review-regulation-consilium-2026-06-22.md`](../../../docs/discussions/code-review-regulation-consilium-2026-06-22.md) · ритм: [`docs/DEVELOPER_RHYTHM.md`](../../../docs/DEVELOPER_RHYTHM.md).

**Владелец:** **Vesnin (Teamlead)** — координирует ритуал, **Tier T0/T1/T2**, **LGTM/BLOCK**; daily сокращённый формат если один пакет.

## When to use

- User asks «code review», «ревью PR», «LGTM на diff», «вечернее ревью».
- Before merge: structured review with **Tier**, **PR size**, **LGTM | BLOCK**.
- Agent should run the script when `ANTHROPIC_API_KEY` is available.

## When NOT to use

- **Morning** — never run `yarn code-review`; read `docs/DAILY_CODE_REVIEW.md` → `membrana-developer-rhythm`.
- Narrow bug/security pass → `review-bugbot` / `review-security`.
- Architecture debate → `membrana-consilium` or `yarn ask vesnin`.

## Commands

| Goal | Command | Output |
|------|---------|--------|
| Evening daily | `yarn code-review` | `docs/DAILY_CODE_REVIEW.md` |
| Extended context | `yarn code-review:full` | same |
| PR before merge | `yarn code-review:pr -- <N>` | `docs/discussions/pr-<N>-code-review.md` |
| Branch | `node scripts/code-review.mjs --branch <name>` | `docs/discussions/branch-<slug>-code-review.md` |
| Uncommitted | `node scripts/code-review.mjs --uncommitted` | `docs/discussions/uncommitted-code-review.md` |
| No API (Ollama) | `yarn local-code-review` | `DAILY_CODE_REVIEW.md` (daily only) |

Options: `--no-rag`, `--out <path>`, `--base origin/main` (with `--branch`).

PR/branch modes inject `docs/MAIN_DAY_ISSUE.md` and `docs/CURRENT_TASK.md` when present.

## Agent workflow

1. Read **regulation v0.2** — tiers, severity, checklist C1–C10, RAG boundaries.
2. Pick mode (daily vs pr vs branch).
3. Run matching `yarn` command from repo root.
4. Summarize: **Tier**, **Вердикт**, top P0/P1, path to markdown.
5. BLOCK → blockers with paths; P2/nit does not block merge.

## Response format (chat without script)

```text
Tier: T0 | T1 | T2

[Teamlead]: … PR size: OK | oversized … LGTM | BLOCK
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
Риски: P0/P1/P2 …
Вердикт: LGTM | BLOCK   (pr/branch only)
```

Daily one-package: Teamlead + Структурщик only (see regulation).

## Related

- Virtual team: `membrana-virtual-team`
- Evening chain: `membrana-developer-rhythm` → `yarn ritual:evening`
- RAG: auto unless `--no-rag`; does not replace diff
