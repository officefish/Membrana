# Journal: sec-upgrade sprint (dev-tooling → tar → electron)

Дата: 2026-07-20  
Порядок мержей (M2): #706 → #707 → #708. Backend-runtime (#688) уже в main.

## Observations

- Issues: #706 / #707 / #708. Linear из RU не создаём (stub / live-snapshot).
- Registry: promptPath → SEC_UPGRADE_*_PROMPT.md; githubIssue проставлены.
- Worktree task1: Membrana-sec-dev-tooling / feat/sec-upgrade-dev-tooling @ origin/main tip.
- vite 7.3.6 + vitest 3.2.7; 34 package.json. Vite 7 строже: package exports требуют dist (turbo test ^build).
- Smoke: cold vite dev HTTP 200; turbo client... build OK; полный turbo test 55/57 затем flaky media-library/rag под нагрузкой — изолированный повтор зелёный.
- Audit: в дереве vite@7 / vitest@3 — цели critical/high по ним закрыты версиями.
