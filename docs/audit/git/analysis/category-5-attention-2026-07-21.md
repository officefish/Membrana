# Category 5 — attention tiers (Эксперимент leftover)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Category | 5 — Эксперимент leftover |
| Registry source | `docs/audit/git/registry/BRANCHES_DECOMPOSE_LIST.md` |
| Base | origin/main |
| Base SHA | `ebba82c7840aa21fa6e94bc760392ac3463b9a89` |
| Method | members from registry only (no ad-hoc rediscovery); churn via `git diff --shortstat origin/main...BRANCH` |
| Thresholds | A1: churn≥2000 OR (files≥40 AND churn≥800); A2: churn≥200 OR files≥10 (below A1); A3: churn>0 OR ahead>0 below A2; A4: churn==0 AND ahead==0 |
| Cache (optional) | `docs/audit/git/cache/cat5-churn-2026-07-21.json` (gitignored) |
| Note | Registry refreshed (Scenario A) before this pass — prior snapshot base `ad474e68…` was stale vs post-#763 `origin/main` |

## Summary by tier

| Tier | Count | Meaning |
| --- | --- | --- |
| A1 | 6 | Крупный уникальный diff vs main — высокий приоритет внимания / salvage tip |
| A2 | 8 | Умеренный уникальный tip — глянуть перед clean |
| A3 | 0 | Малый уникальный tip — беглый взгляд |
| A4 | 6 | Нет уникальных коммитов/diff vs main (behind-only leftover) |
| **Total** | **20** | Совпадает с registry cat.5 |

### Разрез: behind-only vs unique tip

| Класс | Count | Тиры | Вердикт внимания |
| --- | --- | --- | --- |
| Behind-only (`ahead==0`, churn=0) | 6 | все A4 | Кандидаты remote-clean после human ok |
| Unique tip (`ahead>0`, churn>0) | 14 | A1=6 + A2=8 | Salvage / review tip до удаления |

## A1 — high attention (unique tip)

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| codex/task-archive-migration-sprint | 9 | 704 | 33 | 24598 | unique tip; крупный archive/migration diff |
| night/graphify-public-graph-2026-07-15 | 1 | 253 | 10 | 22364 | unique tip; 1 коммит, огромный blob/graph dump |
| cowork/cowork-execution-registry/snapshot-cold-migration | 24 | 103 | 96 | 9470 | unique tip; cowork sprint block |
| cowork/cowork-execution-registry/units-trace-measure | 24 | 103 | 84 | 8169 | unique tip; cowork sprint block |
| cowork/cowork-execution-registry/lead-persona | 24 | 103 | 82 | 7736 | unique tip; cowork sprint block |
| codex/fv1-s2-content | 8 | 704 | 66 | 3981 | unique tip; codex content sprint |

## A2 — moderate attention (unique tip)

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| comp/comp-detection-alarm-2026-07-10/alpha | 5 | 430 | 9 | 1779 | unique tip; competition pack leftover |
| comp/comp-detection-alarm-2026-07-10/gamma | 5 | 430 | 10 | 1340 | unique tip; competition pack leftover |
| cowork/cowork-free-fragment-usercases/neuro-detection | 4 | 281 | 8 | 1293 | unique tip; cowork fragment |
| cowork/cowork-free-fragment-usercases/spectrum-live | 4 | 281 | 8 | 1289 | unique tip; cowork fragment |
| cowork/cowork-free-fragment-usercases/sample-recording | 4 | 281 | 8 | 1272 | unique tip; cowork fragment |
| origin/night/agent-context-optimization-v1-2026-06-27 | 4 | 831 | 25 | 925 | unique tip; remote night leftover |
| chore/ritual-day-0715 | 4 | 281 | 5 | 412 | unique tip; ritual-day leftover |
| parallel-persona-insight | 1 | 382 | 5 | 284 | unique tip; parallel-persona leftover |

## A3 — low attention

_пусто_

## A4 — no unique tip vs main (behind-only)

| Branch | Ahead | Behind | Files | Churn | Note |
| --- | --- | --- | --- | --- | --- |
| origin/comp/comp-mvp-packaging-2026-06-21/alpha | 0 | 905 | 0 | 0 | behind-only; remote comp leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/beta | 0 | 905 | 0 | 0 | behind-only; remote comp leftover |
| origin/comp/comp-mvp-packaging-2026-06-21/gamma | 0 | 905 | 0 | 0 | behind-only; remote comp leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/alpha | 0 | 781 | 0 | 0 | behind-only; remote comp leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/beta | 0 | 781 | 0 | 0 | behind-only; remote comp leftover |
| origin/comp/comp-mvp-async-v2-2026-06-25/gamma | 0 | 781 | 0 | 0 | behind-only; remote comp leftover |

## Recommendations (no execute)

1. **A4 (6 remote `origin/comp/*`):** behind-only, churn=0 — самые безопасные кандидаты на remote GC после явного ok (`yarn repo:clean` dry-run сначала). Уникального tip нет.
2. **A1 (6):** не удалять молча. Три cowork-execution-registry (по 24 ahead) и два codex + night/graphify — salvage-worthy unique tip; перед GC решить: cherry-pick / отдельный PR / осознанный discard. Особенно `night/graphify-public-graph-2026-07-15` (1 commit, churn≈22k) и `codex/task-archive-migration-sprint` (churn≈25k).
3. **A2 (8):** умеренный unique tip — беглый `git log origin/main..BRANCH --oneline` + shortstat глазом; competition/cowork fragments часто уже частично в main через другие PR — проверить пересечение до clean.
4. **Не смешивать с cat.6/cat.7:** здесь префиксный leftover (experiment/ritual), не zombie ahead==0 (cat.6 сейчас пуст после #763) и не generic salvage (cat.7).
5. Тиры A1–A4 — эвристика внимания, не приговор на удаление. **Analysis only — await human for GC.**
