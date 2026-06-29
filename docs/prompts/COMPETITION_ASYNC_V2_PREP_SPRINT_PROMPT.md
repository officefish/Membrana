# Prep sprint: competition async v2

> **id:** `competition-async-v2-prep-2026-06-25`  
> **Следующий sprint:** `comp-mvp-async-v2-2026-06-25`  
> **OPEN:** [`docs/day-sprint/competition-async-v2-prep-sprint-2026-06-25/OPEN.md`](../day-sprint/competition-async-v2-prep-sprint-2026-06-25/OPEN.md)

## Цель

1. Заархивировать competition UserCases v1 (alpha/beta/gamma) в catalog.  
2. Синтезировать три замысла v1 в один документ для команд v2.  
3. Подготовить brief async v2 → gate к `COMPETITION_SPRINT_ACTIVE` open.

## Команды

```bash
# Синтез (DeepSeek — при балансе; fallback Anthropic)
node scripts/generate-competition-v1-synthesis.mjs
node scripts/generate-competition-v1-synthesis.mjs --deepseek

yarn deepseek:task --prompt-file docs/competition-sprint/.../PREP_SYNTHESIS_PROMPT.txt ...

yarn workspace @membrana/device-board test -- src/catalog/user-case-catalog.test.ts
yarn usercase:build-competition-all   # rebuild archived forks (CI)
```

## Gate (P3)

- [ ] LGTM brief `comp-mvp-async-v2-2026-06-25`
- [ ] `yarn task:archive competition-async-v2-prep-2026-06-25`
- [ ] Открыть competition: обновить `COMPETITION_SPRINT_ACTIVE.md`, три ветки
