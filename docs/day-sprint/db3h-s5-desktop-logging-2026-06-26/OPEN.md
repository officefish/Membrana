# OPEN: DB3H-S5 — Desktop logging & support feedback

| Поле | Значение |
|------|----------|
| **Sprint** | `db3h-s5-desktop-logging-2026-06-26` |
| **Registry** | `db3h-s5-desktop-logging` |
| **Parent** | `device-board-three-hosts-2026-06-26` |
| **Status** | **active** — policy v1.0 LGTM; DL-DOC + DL-IMPL |
| **Started** | 2026-06-26 |
| **Blocks** | `db3h-s4-microphone-detectors` |

**Prompt:** [`DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md`](../../prompts/DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md)  
**Канон:** [`DESKTOP_APP_LOGGING_POLICY.md`](../../DESKTOP_APP_LOGGING_POLICY.md) v1.0  
**Консилиум:** [`desktop-logging-policy-2026-06-26.md`](../../seanses/desktop-logging-policy-2026-06-26.md)

---

## Phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| DL-0 | Консилиум + policy v1.0 LGTM | ✅ |
| **DL-DOC** | Матрица docs §10 (README apps + все контуры) | ✅ |
| DL-tools | `yarn desktop:support-collect` (draft) | ✅ |
| DL-1 | `electron-log` shell M1 в main | ✅ |
| DL-2 | Auto-flush T1 на scenario stop | ✅ |
| DL-3 | In-app UX (папка логов, diagnostics) | ⏳ optional |

### DL-DOC checklist (§10 политики)

| Файл | Статус |
|------|--------|
| `docs/DESKTOP_APP_LOGGING_POLICY.md` | ✅ v1.0 |
| `apps/membrana-studio/README.md` | ✅ |
| `apps/membrana-device/README.md` | ✅ |
| `apps/client/README.md` | ✅ |
| `docs/STUDIO_HOST_BRIDGE_CONTRACT.md` §7.5 | ✅ |
| `docs/support/DESKTOP_SUPPORT_RUNBOOK.md` | ✅ |
| `docs/actions/device-board/CLIENT_LOGS_PARSING.md` | ✅ |
| `docs/actions/device-board/STUDIO_HOST_LESSONS.md` | ✅ |
| `logs/README.md`, `logs/apps/studio/README.md` | ✅ |
| `.cursor/skills/membrana-client-logs-parsing/SKILL.md` | ✅ |
| `AGENTS.md` | ✅ |
| `docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md` | ✅ |

---

## Команды

```bash
yarn desktop:support-collect
yarn logs:parse -- --file "%APPDATA%/Membrana/logs/device-board-trace-latest.txt"
```

**Предшественник:** [`db3h-s3 CLOSURE`](../db3h-s3-studio-host-2026-06-26/CLOSURE.md)
