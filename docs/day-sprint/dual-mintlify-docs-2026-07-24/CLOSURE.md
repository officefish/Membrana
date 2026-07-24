# CLOSURE: dual-mintlify-docs — product + harness Mintlify

| Поле | Значение |
|------|----------|
| **Sprint** | `dual-mintlify-docs-2026-07-24` |
| **Epic** | `dual-mintlify-docs` · [#1121](https://github.com/officefish/Membrana/issues/1121) |
| **Status** | **closed** |
| **Closed** | 2026-07-24 |
| **PRs** | W1 [#1129](https://github.com/officefish/Membrana/pull/1129) · W2 [#1132](https://github.com/officefish/Membrana/pull/1132) · W3 [#1140](https://github.com/officefish/Membrana/pull/1140) `4b13a891` |
| **Ратификация** | владелец «ратифицирую» 2026-07-24 · harness subdomain locked `harness.mmbrn.tech` |
| **Abandoned** | [#1120](https://github.com/officefish/Membrana/pull/1120) — CLOSED, **не влит** (tabs-as-final STOP) |

## Delivered

1. **W0 brief:** Issues #1121–#1126, OPEN, Also open (Focus `tasks-workshop` цел).
2. **W1 split:** `apps/docs` (product) + `apps/docs-harness` (harness); оба `docs.json` с object-navigation (`navigation.groups`).
3. **W2 wires:** `yarn tooling:atlas --render` → harness path; `yarn docs:verify:all`; CUSTOM_DOMAIN notes ×2.
4. **W3 surface:** Panel `ToolingAtlasBoard` → `https://harness.mmbrn.tech/tooling/containers` (+ fallback `membrana-harness.mintlify.app`); panel deploy OK.
5. **Owner DNS (harness):** Mintlify project `membrana-harness`, path `/apps/docs-harness`, TXT+CNAME, live HTTPS.

## Owner checklist

- [x] Второй Mintlify project (`membrana-harness`), GitHub App → `apps/docs-harness`
- [x] Subdomain: **`harness.mmbrn.tech`** (rename → `ops` не понадобился)
- [x] Custom domain + CNAME/TXT в зоне `mmbrn.tech` (office не ломали)
- [ ] Product `docs.mmbrn.tech` отдаёт Device Board — **остаток:** на 2026-07-24 `docs.mmbrn.tech` NXDOMAIN; дерево product в `apps/docs` цело (R1). Довести DNS/Publish product — вне DoD harness, follow-up владельца.
- [x] Harness `https://harness.mmbrn.tech/tooling/containers` → HTTP 200
- [x] Panel live → harness URL (PR #1140 + `_ssh-panel-deploy` 2026-07-24)

## Инварианты R1–R6

| ID | Статус |
|----|--------|
| R1 product board docs остаются в `apps/docs` | ✅ (custom domain product — residual) |
| R2 harness: tooling/bestiary/llm-calls/git | ✅ |
| R3 object navigation на обоих сайтах | ✅ |
| R4 Panel → harness public URL | ✅ |
| R5 Focus `tasks-workshop` не затёрт | ✅ |
| R6 Issues после ратификации | ✅ |
| #1120 не влит | ✅ CLOSED without merge |

## Phases

| Phase | Issue | PR / evidence | Archive |
|-------|------:|---------------|---------|
| W0 | #1122 | brief | archived |
| W1 | #1123 | [#1129](https://github.com/officefish/Membrana/pull/1129) | archived |
| W2 | #1124 | [#1132](https://github.com/officefish/Membrana/pull/1132) | archived |
| W3 | #1125 | [#1140](https://github.com/officefish/Membrana/pull/1140) · panel deploy | archived с этим CLOSURE |
| W4 | #1126 | этот CLOSURE | archived |

## Out of scope / residual

- Product `docs.mmbrn.tech` DNS + Publish (отдельный owner track; не блокирует harness).
- Третий Mintlify / i18n / products-switcher.
- Agent-truth (`docs/catalog/`, …) в публичный Mintlify.
