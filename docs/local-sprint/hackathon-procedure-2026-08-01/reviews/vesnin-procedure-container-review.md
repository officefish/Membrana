# Vesnin review: hackathon procedure container and route skill

**Verdict:** LGTM after BLOCK repair.

## Scope

- `docs/procedures/hackathon/README.md`
- `docs/procedures/hackathon/MANIFEST.json`
- `docs/procedures/registry.json`
- `.cursor/skills/membrana-hackathon/SKILL.md`
- `.agents/skills/membrana-hackathon/SKILL.md`
- `.claude/skills/membrana-hackathon/SKILL.md`
- `.opencode/skills/membrana-hackathon/SKILL.md`
- `.cursor/skills/README.md`
- `scripts/lib/task-registry.mjs`
- `scripts/task-register.test.mjs`

## Initial BLOCK

Vesnin found two P1 defects:

1. The route skill required `sprintKind: "hackathon"`, but
   `scripts/lib/task-registry.mjs` did not allow that kind.
2. The route skill required `parentHackathonId`, but `task:register` could not
   write it.

## Repair

`scripts/lib/task-registry.mjs` now keeps the sprint-kind list closed but adds
`hackathon` as a named canonical kind. `buildTaskEntry` writes
`parentHackathonId` from `parentHackathonId`, `--parent-hackathon-id`, or
`parentHackathon`.

`scripts/task-register.test.mjs` covers `kind: "hackathon"` with
`parentHackathonId`.

## Checked

- `node --test scripts/task-register.test.mjs`
- `node scripts/procedures-registry.mjs --check`
- `node scripts/procedural-workshop.mjs --audit`
- `node scripts/procedural-workshop.mjs --inspect hackathon`

## Final

Both P1 findings are resolved. Procedure container, registry entry, route skill
and mirrors are coherent.
