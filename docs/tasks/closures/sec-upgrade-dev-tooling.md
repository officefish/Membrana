# Closure: sec-upgrade-dev-tooling

| Поле | Значение |
|------|----------|
| acceptedBy | Teamlead (vesnin) / owner sprint order |
| headRev | 05a0bf0d78daf691d8f7f4a6912d21b982cba71d |
| PR | #710 |
| Issue | #706 |
| MergedAt | 2026-07-20T12:32:26Z |

## DoD
- vite ^7 / vitest ^3 in 34 workspaces (lock: 7.3.6 / 3.2.7)
- cold vite smoke HTTP 200; client prod build OK
- full CI green; intentional corpus-baseline spectral-flux reanchor (pre-existing on main)
