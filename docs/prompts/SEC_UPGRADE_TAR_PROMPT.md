# Task-промпт: sec-upgrade-tar

> Размер: **M** · lead: **dynin** · support: **kuryokhin** · Issue: **#707**  
> Вердикт: `docs/seanses/security-posture-m2-upgrade-2026-07-19.md`  
> Linear: stub / movementMode live-snapshot — не создавать Linear из RU  
> Строго **после** `sec-upgrade-dev-tooling` и **до** `sec-upgrade-electron`

## Контекст

Апгрейд №3: **tar 6→7**. Транзитивен (`electron-builder`, `node-gyp`).  
**Без слепых `resolutions` на всё дерево** — локальный форс + канарейка полной desktop-сборки.

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #707 ⟺ registry id sec-upgrade-tar.
Ответственный: dynin. Support: kuryokhin.
Поднять tar до 7 локальным форсом (не слепой resolutions на всё дерево).
Канарейка: полная desktop-сборка. DoD: 6 tar high сняты; node-gyp/electron-builder живы.
Не поднимай electron. Vite/vitest/Nest не трогай.
```

## Definition of Done

- [ ] tar 7 в дереве зависимостей без слепого whole-tree resolutions force
- [ ] 6 tar high advisories сняты
- [ ] канарейка полной desktop-сборки зелёная
- [ ] полный CI зелёный
- [ ] PR + отчёт в #707; registry `githubIssue: 707`
- [ ] closure `{acceptedBy, headRev}`

## Out of scope

electron major, vite/vitest, Nest/fastify.
