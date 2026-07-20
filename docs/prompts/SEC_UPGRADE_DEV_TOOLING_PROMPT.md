# Task-промпт: sec-upgrade-dev-tooling

> Размер: **L** · lead: **rodchenko** · support: **kuryokhin** · Issue: **#706**  
> Вердикт: `docs/seanses/security-posture-m2-upgrade-2026-07-19.md`  
> Linear: stub / movementMode live-snapshot — не создавать Linear из RU

## Контекст

Апгрейд №2 security-posture: **vite 5→7 + vitest 1→3** по затронутым workspace (~30).

Фазы (строго):
1. `packages/services` foundation (`audio-engine`, `io-engine` и аналоги)
2. analyzers / detectors
3. `apps/client` (+ остальные apps с vite/vitest в том же PR, после foundation)

Не смешивать с Nest/fastify, tar, electron.

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #706 ⟺ registry id sec-upgrade-dev-tooling.
Ответственный: rodchenko. Support: kuryokhin. Исполнитель обезличен.
Поднять vite ^7 и vitest ^3 во всех затронутых workspace.
Фазы: foundation → detectors/analyzers → apps/client.
DoD: audit без vitest critical и vite high; smoke cold vite dev + HMR + prod bundle aliases.
Не трогай Nest/fastify/tar/electron. Linear не создавай из RU.
```

## Definition of Done

- [ ] `vite` → `^7` и `vitest` → `^3` в затронутых `package.json` (~30 workspace)
- [ ] `yarn npm audit` / advisory: нет vitest critical и vite high (fs.deny Windows)
- [ ] foundation → detectors unit-тесты зелёные (нет NaN/клиппинга в спектральных функциях)
- [ ] клиентский smoke: cold `vite dev`, HMR без потери state где применимо, prod bundle без ошибок алиасов `@membrana/*`
- [ ] полный CI зелёный; один мажор-PR в корневой lockfile
- [ ] PR + отчёт в #706; registry `githubIssue: 706`, `promptPath` на этот файл
- [ ] closure-заготовка `{acceptedBy, headRev}`

## Out of scope

Nest/fastify (уже #688), tar 7, electron major, боевой Linear API.
