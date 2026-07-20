# Journal: sec-upgrade sprint (dev-tooling → tar → electron)

Дата: 2026-07-20  
Порядок мержей (M2): #706 → #707 → #708. Backend-runtime (#688) уже в main.

## Observations

- Issues: #706 / #707 / #708. Linear из RU не создаём (stub / live-snapshot).
- Registry: promptPath → SEC_UPGRADE_*_PROMPT.md; githubIssue проставлены.
- Worktree task1: Membrana-sec-dev-tooling / feat/sec-upgrade-dev-tooling.
- vite 7.3.6 + vitest 3.2.7; 34 package.json. Vite 7 строже: package exports требуют dist (turbo ^build).
- Smoke: cold vite HTTP 200; client... build OK.
- Drift gate: spectral-flux F1 0.5733 vs baseline 0.6047 — **pre-existing на origin/main** (воспроизводится без vite7; vite5 rebuild тот же F1). Path-filter detectors/** вскрыл гейт. Baseline обновлён осознанно в PR #710.
