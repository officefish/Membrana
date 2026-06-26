# OPEN: DB3H-S1 — техдолг

| Поле | Значение |
|------|----------|
| **Sprint** | `db3h-s1-tech-debt-2026-06-26` |
| **Registry** | `db3h-s1-tech-debt` |
| **Parent** | `device-board-three-hosts-2026-06-26` |
| **Status** | **closed** → [`CLOSURE.md`](./CLOSURE.md) |
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
| C | task:archive merged + sync-readme | ✅ при CLOSURE |
| D | Repo hygiene + `yarn test:scripts` in CI | ✅ scripts + ci.yml step (#12) |
| E | async-v2 L18–L23 PR | ✅ [PR #181](https://github.com/officefish/Membrana/pull/181) merged `639ca9d` |
| F | #178 track-upload smoke | ✅ в #181; smoke `c778c4ee` upload-ok=4 |

---

## #178 — track-upload (2026-06-26)

**Симптом:** `upload-failed` × N, `async-job rejected`, detached report не стартует.  
**Не граф:** gate/trends OK; pending track есть; падение в `importBlob`.

**Вероятные причины (ранжировано):**

1. **remote-server** (`paired` + `background-media`): POST `/samples` — 401/413/unsupported MIME; смотреть `error` в chain-log `upload-failed`.
2. **browser-limited:** `BUFFER_FULL` (≥10 samples) или `QUOTA_EXCEEDED`.
3. **EMPTY_BLOB** — L18 до fix; второй gate без re-arm.
4. **init race** — `importBlob` до `mediaSvc.init()` (холодный snapshot).

**Правка в ветке:** `await mediaSvc.init()` + early reject `blob.size === 0`.

**Smoke:** `yarn media:dev` если `storageMode: remote-server`; иначе autonomous browser fallback достаточен.

```bash
yarn logs:parse   # после run ≥60s
```

```bash
yarn turbo run lint typecheck test build --continue
yarn turbo run lint --filter=@membrana/device-board --force
yarn test:scripts
yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-2026-06-26.json --dry-run
yarn task:list
```
