---
description: Run the Membrana evening ritual (archive → RAG index → code review)
agent: build
---

Run the evening ritual in the correct order (archive morning files BEFORE code review).

1. Execute `yarn ritual:evening`, which runs in sequence:
   archive night-hunt → archive daily-day → `rag-evening-index` → `code-review` → archive daily-code-review → evening tail.
2. RAG index is non-blocking: it skips silently if `OPENAI_API_KEY` is missing (it is in `.env`).
3. Outputs: `docs/archive/daily-day/<date>/`, `docs/DAILY_CODE_REVIEW.md`.
4. Summarize the code-review verdict (Tier, LGTM/BLOCK) and any P0/P1 risks.

Skills: `membrana-developer-rhythm`, `membrana-code-review`. For local/no-API: `yarn ritual:evening:local`.

$ARGUMENTS
