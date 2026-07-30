<!-- Сгенерировано: 2026-07-29T15:23:43.550Z (yarn code-review; uncommitted, llm-xai) -->

Tier: T1

[Teamlead]: PR size: OK (~244 lines). Скоуп цельный: зуб процедурной ветки (Р4 / #925) + архивация трёх карточек с evidence + пересборка decompose. Бестиарий: B6 не пойман — при `--allow-transport` guard остаётся видимым в логе; B3 не пойман — archiveNotes опираются на тесты/smoke/HANDOFF, не на «символ есть»; B7 — лёгкий запах у `.cursor/settings.json` (mintlify) рядом с guard/registry: либо в тот же commit с явной связью к `tooling-atlas`, либо убрать из этого набора. Вердикт: **LGTM** после зелёных тестов грамматики; BLOCK не ставлю.  
[Структурщик]: `proceduralTransportProblems` — чистая функция в `branch-grammar.mjs`, defaults совпадают с `layer-rules.json` (`proceduralKinds` / prefixes) — слабая связанность и fallback на месте. `branch-check.mjs` собирает diff+untracked через `tryGitLines` — уместно для uncommitted/PR. Реестр: `procedural-branch-guard` → archived + DRU-322; NB5/NB7 — stale close с пруфами; README/decompose синхронны.  
[Математик]: —  
[Музыкант]: —  
[Верстальщик]: —

Итоговый артефакт: `docs/discussions/uncommitted-code-review.md` (логика ревью; в дерево не пишу)  
Definition of Done: `node --test scripts/branch-grammar.test.mjs`; smoke: `node scripts/branch-check.mjs` на `chore/*` → pass; на `storm/*` с transport-путём → fail без флага, pass с `--allow-transport` / `MEMBRANA_ALLOW_PROCEDURAL_TRANSPORT=1`  
Риски:  
- **P2** — `.cursor/settings.json` вне продуктового контура guard; риск B7 «заодно».  
- **P2** — #925 Issue ещё open при archived-карточке (зафиксировано в notes; не блокер merge/commit карточки).  
- **P2** — patterns в `tasks-decompose.config.json` разрослись (ритуалы) — следить, чтобы новые id не утекали в «прочее» молча.  

Вердикт: LGTM