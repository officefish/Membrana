# Angelina Hostess Implementation Audit

Date: 2026-10-01. Subject: active task `angelina-hostess-impl` against
`origin/main` at `00257180`. The generated phrase "autonomous agent" is not part of this
audit; the only contract is the five owner-ratified verdicts M1..M5.

## Summary

| Verdict | done | partial | missing | Total |
|---------|-----:|--------:|--------:|------:|
| M1 C | 4 | 3 | 0 | 7 |
| M2 B | 7 | 0 | 0 | 7 |
| M3 G | 6 | 0 | 0 | 6 |
| M4 H | 3 | 3 | 0 | 6 |
| M5 GC | 5 | 1 | 1 | 7 |
| **Total** | **25** | **7** | **1** | **33** |

`done` requires a live predicate and a red case, not merely a file. The focused corpus is
201/201 green. Three residual block predicates are red on this untouched trunk (exit 1 each).

## M1 C - canons and skills

| DoD | Status | Evidence in trunk |
|-----|--------|-------------------|
| 1. Canonical morning skill plus two thin mirrors, `status: live`, triggers | done | `.cursor/skills/membrana-morning-ritual/SKILL.md:2-7`, `.agents/skills/membrana-morning-ritual/SKILL.md:2-12`, `.claude/skills/membrana-morning-ritual/SKILL.md:2-16`. Live-repository predicate and red malformed-status cases: `scripts/skill-status.test.mjs:21-45,83-98`. |
| 2. Morning removed from developer rhythm and canon replaced by links | done | `.cursor/skills/membrana-developer-rhythm/SKILL.md:18-29`; `docs/DEVELOPER_RHYTHM.md:28`; atomic implementation `aff8b1b9` / PR #756. Live leak predicate: `scripts/skill-status.test.mjs:68-98`. |
| 3. Coverage, disjointness, no-orphans partition predicates | done | `scripts/lib/skill-status.mjs:91-114`; green and three red cases `scripts/skill-status.test.mjs:47-65`. |
| 4. `docs:verify-canon` enforces status graph and morning leakage | done | `scripts/lib/skill-status.mjs:32-86,118-145`; integration `scripts/skill-status.test.mjs:83-98`; command is wired at `package.json:403`. Red cycle, broken target, non-live terminal and leak cases are in the same test. |
| 5. Generated skills README with Status column and `skills:sync-readme` | partial | `.cursor/skills/README.md:7-8` has only `Skill / Triggers`; `package.json` has no `skills:sync-readme`. Red porcha: static predicate printed `PORCHA M1 ... (нет) | Skill | Triggers (summary) |`, exit 1. |
| 6. Terminal failover plus transition provenance in a journal | partial | Terminal routing is protected by `freshSkill` / status-DAG (`scripts/lib/skill-status.mjs:32-86`), and `morning-entry` rejects zero doors (`scripts/morning-entry.test.mjs:20-45`). No append-only transition journal for `supersededBy`/failover was found; the live test corpus proves routing, not transition provenance. |
| 7. docs lint + verify green, Teamlead boundary review | partial | Historical boundary review shipped in `aff8b1b9` / #756. Focused skill tests pass, but `node scripts/verify-docs-canon.mjs` exits 1 on seven live promises (`scripts/lib/personas.mjs` x6 and `yarn npm` x1), so the literal green-gate DoD is not currently true. |

## M2 B - code-built canon

| DoD | Status | Evidence in trunk |
|-----|--------|-------------------|
| 1. Five stable slots and premises section | done | Slot identity/order: `scripts/lib/day-plan-frame.mjs:14-22,34-36`; premises are a mandatory service section in assembly: `scripts/lib/day-plan-assemble.mjs:9-22`. Green composition and red empty-premises behavior: `scripts/day-plan-assemble.test.mjs:12-51`. |
| 2. Per-slot `fill`, no monolithic skeleton, section order equals frame | done | `fillInput` exposes one slot without structure (`scripts/lib/day-plan-frame.mjs:104-113`); `assemble` consumes per-slot results (`scripts/lib/day-plan-assemble.mjs:24-78`). Red malformed/empty slot tests and stable order: `scripts/day-plan-assemble.test.mjs:12-47`. |
| 3. `filled/empty/malformed`, visible warning, five sections, retryable slot | done | Closed status enum and normalization: `scripts/lib/day-plan-assemble.mjs:19,24-39`; visible warnings and total assembly: lines 42-78. Red empty/malformed cases: `scripts/day-plan-assemble.test.mjs:28-47`. |
| 4. `sign(doc, author)`, `canon:sign --author human`, structural/digest guard | done | Pure signing and digest predicate: `scripts/lib/day-plan-assemble.mjs:87-114`; red tampered digest and invalid author: `scripts/day-plan-assemble.test.mjs:53-64`; CLI at `package.json:46` and `scripts/canon-sign.mjs:28-76`. |
| 5. Human/LLM source badge in canon header | done | Provenance parsing and honest-human priority: `scripts/lib/angelina-adapter.mjs:14-75`; red absent/broken provenance and human fixtures: `scripts/angelina-adapter.test.mjs:17-90`. |
| 6. Existing scripts only; script tests green | done | Implementation commit `4f8e216a` / #765 uses `scripts/lib/day-plan-*.mjs`; focused suite in this audit passed 201/201. No new package was introduced by that commit. |
| 7. Teamlead boundary B vs G/H/GC | done | Review/delivery commit `4f8e216a` / PR #765; G lives separately in `scripts/lib/morning-gates.mjs`, H in `scripts/angelina.mjs`, GC in `scripts/gc.mjs`. |

## M3 G - gates in code

| DoD | Status | Evidence in trunk |
|-----|--------|-------------------|
| 1. Three pure predicates, no network/Telegram/DOM | done | `magistralChosen`, `swallowApproved`, `canSend` in `scripts/lib/morning-gates.mjs:242-357`; pure unit corpus in `scripts/morning-gates.test.mjs:18-130`. Red block-by-one/both cases are explicit. |
| 2. Effect adapter behind `canSend`, deterministic idempotency key | done | `sendIdempotencyKey` and `terminalSend`: `scripts/lib/morning-gates.mjs:359-444`; red blocked transport and digest mismatch: `scripts/morning-gates.test.mjs:91-112`. |
| 3. canSend, top-three determinism, duplicate send and retry teeth | done | `scripts/morning-gates.test.mjs:54-112` and `scripts/day-plan-frame.test.mjs:29-50`; duplicate call is a no-op on one key. |
| 4. Frozen top-three snapshot is state input | done | Snapshot digest/freeze path: `scripts/lib/morning-gates.mjs:150-240`; mutation red case: `scripts/morning-gates.test.mjs:114-125`. |
| 5. Three readable echo lines in morning output | done | `scripts/morning-gate.mjs:57-66` prints magistral, swallow, and `canSend`; blocked reasons are named. |
| 6. No path to send around `canSend` | done | `terminalSend` owns the effect boundary (`scripts/lib/morning-gates.mjs:405-444`); tests assert transport count zero when blocked and one when passed (`scripts/morning-gates.test.mjs:91-112`). |

## M4 H - morning hostess

| DoD | Status | Evidence in trunk |
|-----|--------|-------------------|
| 1. One `ritual:day` entry and no competing autostart | done | Observer in `scripts/angelina.mjs:41-126`, pure predicate in `scripts/lib/morning-entry.mjs`; zero/one/two/autostart red cases: `scripts/morning-entry.test.mjs:20-177`. Implementation `b9e0e811` / #2088. |
| 2. First explicit greeting: Angelina, HEAD, frontier | done | `greet()` reads HEAD/frontier and prints the greeting first: `scripts/angelina.mjs:135-171`. Red unknown-head behavior is explicit in code; entry verdict is test-covered at `scripts/morning-entry.test.mjs:55-60`. |
| 3. Mechanical gates invoked as `analyst` subagents, no copied logic | partial | Analyst return schema and red malformed-return cases exist in `scripts/angelina-validate.test.mjs`; delegation policy exists in `scripts/angelina-delegate.test.mjs`. But `scripts/angelina.mjs:19-22,171-188` invokes cascade/entry directly and contains no `analyst` call, so policy is not wired into the hostess. Red porcha exits 1. |
| 4. Availability follows active session and is shut down by evening | partial | No resident daemon exists, which satisfies the negative half. No `session_active` state or evening-off transition is present in `scripts/angelina.mjs`; the combined static porcha exits 1. |
| 5. Atomic removal of old autostart with visible trace | done | `|entry|=1` live observer plus red second-autostart cases (`scripts/morning-entry.test.mjs:20-177`); greeting prints the verdict (`scripts/angelina.mjs:156-157`). Historical H implementation: `ac9e9b0e` / #769. |
| 6. Final artifact premises before verdict and four echoes | partial | Premises are structurally enforced for meeting protocols (`scripts/lib/protocol-validator.mjs:269` plus red cases in `scripts/protocol-validator.test.mjs:183-260`). Morning output carries gate echoes, but there is no single hostess-render predicate asserting premises-before-verdict plus exactly four echo lines. |

## M5 GC - void lifecycle

| DoD | Status | Evidence in trunk |
|-----|--------|-------------------|
| 1. Deterministic GC, `isDead`/`isStale`, derived move without orphans | done | `scripts/lib/gc-void.mjs:20-114`; red half-predicate and missing-path cases in `scripts/gc-void.test.mjs:11-58`; parent+derived integration in `scripts/gc.test.mjs`. |
| 2. `docs/void`, epitaph, rejected fields in registry schema/validator | partial | Epitaph and void home exist (`docs/void/README.md:5-16`; `scripts/lib/gc-void.mjs:41-58`). The live `docs/tasks/registry.json` contains neither `rejectedReason` nor `rejectedBy`; decision evidence is instead projected through `scripts/lib/void-sentence.mjs:79-116`. Literal registry/schema half of the ratified DoD is absent. |
| 3. Three independent barriers with red reports | done | `scripts/verify-void-barriers.mjs`; independent red epitaph/index/live-link fixtures: `scripts/verify-void-barriers.test.mjs:49-111`; CI wiring landed in `4514171d` / #2091. |
| 4. `recent_void_penalty` in planning generators | done | `scripts/lib/insight-ritual.mjs:392-420`; red/green wiring and expiry tests: `scripts/verify-void-barriers.test.mjs:127-240`. |
| 5. Evening step after verdict closure and noisy epitaph report | done | `docs/tasks/evening-ritual-steps.json:244-259`; runner/report `scripts/gc.mjs:129-186`; zero and moved reports covered in `scripts/gc.test.mjs`. Implementation `98045f24` / #2090. |
| 6. Starter register of known exhibits plus grep-inventory canon | missing | `docs/void/` currently has zero grave directories and only README/LIFECYCLE. Fixture graves prove mechanics but are not the required starter inventory. Red porcha printed `graves: 0`, exit 1. |
| 7. Teamlead boundary GC vs worktree hygiene, provenance preserved | done | `docs/void/README.md:18-22` states the boundary; complete body is moved, not deleted (`scripts/gc.test.mjs`, monotonic-history case). Closure/review landed in `4514171d` / #2091. |

## Commands And Outcomes

```text
node --test <14 focused files>
  tests 201, pass 201, fail 0

node scripts/verify-docs-canon.mjs
  exit 1; 7 live canon promises unresolved (six personas path, one yarn npm phrase)

porcha M1 / M4 / M5 static predicates
  exits 1 / 1 / 1 on origin/main 00257180
```

## Audit Verdict

Archiving is premature. M2 and M3 are complete; M1, M4 and M5 retain eight explicit DoD
gaps. The proposed sprint cut is limited to those residuals and does not reopen accepted
behavior. Owner ratification is required before any implementation.
