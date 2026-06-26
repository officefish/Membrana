# OPEN: DB3H-S1 — техдолг

| Поле | Значение |
|------|----------|
| **Sprint** | `db3h-s1-tech-debt-2026-06-26` |
| **Registry** | `db3h-s1-tech-debt` |
| **Parent** | `device-board-three-hosts-2026-06-26` |
| **Status** | **open** |
| **Started** | 2026-06-26 |

**Prompt:** [`DB3H_S1_TECH_DEBT_SPRINT_PROMPT.md`](../../prompts/DB3H_S1_TECH_DEBT_SPRINT_PROMPT.md)  
**Канон дня:** [`MAIN_DAY_ISSUE.md`](../../MAIN_DAY_ISSUE.md)

**Out of scope:** `yarn rag:index --full`, OPENAI_API_KEY, нейро-контракт, cabinet/Studio deploy.

---

## Phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| A | CI baseline + device-board lint 0 warnings | ✅ 126/126 turbo |
| B | Issues audit manifest + report | ✅ `docs/archive/github-issues-audit-2026-06-26.md` |
| C | task:archive merged + sync-readme | ⏳ (нет merged в manifest; sync при закрытии) |
| D | Repo hygiene + `yarn test:scripts` in CI | ✅ scripts + ci.yml step (#12) |
| E | async-v2 L18–L19 PR | ⏳ (ветка `fix/async-v2-l18-l19-recording-detached`) |

---

## Команды

```bash
yarn turbo run lint typecheck test build --continue
yarn turbo run lint --filter=@membrana/device-board --force
yarn test:scripts
yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-2026-06-26.json --dry-run
yarn task:list
```
