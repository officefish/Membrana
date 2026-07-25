# CLOSURE: membrana-leveling-adopt — skill + soft evening

| Поле | Значение |
|------|----------|
| **Sprint** | `membrana-leveling-adopt-2026-07` |
| **Epic** | `membrana-leveling-adopt` |
| **Status** | **closed** |
| **Closed** | 2026-07-25 |
| **Стык** | Focus `tasks-workshop` не затёрт (Also open only) |

## Delivered

1. **g0:** OPEN + [`MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md`](../../prompts/MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md) + registry epic/phases; §8 регламента → realized→adopt.
2. **skill:** `.cursor/skills/membrana-leveling/SKILL.md` + thin mirrors Claude / OpenCode / `.agents`; строка в skills README.
3. **wires:** `scripts/lib/membrana-leveling-snapshot.mjs` + `yarn membrana-leveling:snapshot` (+ unit tests).
4. **evening:** шаг `leveling-workspace` в `evening-ritual-steps.json` (после insight-drift, до code-review); `scripts/membrana-leveling-evening.mjs`; карта `ritual-exit-codes.json` (exit 3 = finding).
5. **deliver:** шов в [`HANDOFF.md`](../../HANDOFF.md) «Вечерний leveling».
6. **rhythm:** проводка в `membrana-developer-rhythm` → манифест + указатель на skill.
7. **pilot:** см. ниже.

## Pilot (DoD)

```text
node scripts/ritual-evening-run.mjs --dry
→ leveling-workspace: … membrana-leveling-evening.mjs (noncritical)

node scripts/ritual-evening-run.mjs --only leveling-workspace --dry
→ ok leveling-workspace · критичных отказов нет

yarn membrana-leveling:snapshot --out <snap.json>
→ JSON { items, namedTrash, unfinishedCards } для --snapshot workspace-level

node scripts/membrana-leveling-evening.mjs --date 2026-07-25 --json
→ exit 3 (finding/STOP unnamed-trash на dirty WIP) · отчёт
  docs/seanses/workspace-level-2026-07-25.md · team-evening-feedback не рвётся
```

Unit: `node --test scripts/membrana-leveling-snapshot.test.mjs` ·
`node --test scripts/ritual-exit-codes.test.mjs` — pass.

## DoD checklist

- [x] Skill live + mirrors + README skills
- [x] `yarn membrana-leveling:snapshot` → JSON для workspace-level
- [x] Шаг в манифесте; артефакт отчёта; soft finding не рвёт feedback
- [x] HANDOFF шов-ссылка
- [x] Pilot `--dry` / `--only` в этом CLOSURE
- [x] Карточки фаз → archive; epic → archived

## Вне скоупа (остаётся вне)

Hard-gate вечера · авто-merge · UI утра · `#900` · пересмотр disposition.
