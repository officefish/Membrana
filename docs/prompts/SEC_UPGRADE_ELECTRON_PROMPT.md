# Task-промпт: sec-upgrade-electron

> Размер: **M** · lead: **dynin** · support: **kuryokhin** · Issue: **#708**  
> Вердикт: `docs/seanses/security-posture-m2-upgrade-2026-07-19.md`  
> Linear: stub / movementMode live-snapshot — не создавать Linear из RU  
> Строго **после** `sec-upgrade-tar`

## Контекст

Апгрейд №4 (рискованный): **electron major** с линии 33.4.11 — безопасная актуальная линия с фиксом UAF/cmdline.  
Ручной desktop-smoke обязателен; headless — честный defer.

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #708 ⟺ registry id sec-upgrade-electron.
Ответственный: dynin. Support: kuryokhin.
Поднять electron major на безопасную актуальную линию (UAF/cmdline fixes).
DoD: 4 electron high сняты; ручной desktop-smoke (окно, device-board capture, no CSP regression).
Если полный smoke headless невозможен — defer в notes + что прогнано автоматически.
Не трогай vite/vitest/Nest; tar уже должен быть на 7.
```

## Definition of Done

- [ ] electron major на безопасной актуальной линии
- [ ] 4 electron high advisories сняты
- [ ] checklist в PR/Issue: окно, device-board capture, no CSP regression
- [ ] если ручной smoke невозможен — честный defer + авторезультаты
- [ ] полный CI зелёный
- [ ] PR + отчёт в #708; registry `githubIssue: 708`
- [ ] closure `{acceptedBy, headRev}`

## Out of scope

vite/vitest, tar (уже 7), Nest/fastify, office/media deploy.
