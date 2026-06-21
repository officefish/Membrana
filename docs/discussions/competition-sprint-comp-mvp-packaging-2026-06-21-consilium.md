# Consilium: Competition Sprint — MVP UserCase упаковка

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-packaging-2026-06-21` |
| **brief** | [`COMPETITION_SPRINT_BRIEF.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_SPRINT_BRIEF.md) |
| **phase** | 3 — consilium **closed** 2026-06-21 |
| **commits** | Phase 2β `e507a2e`, docs `c2e13fe` |

---

## Demo recap

| Team | UserCase | Canvas / apply | Run F1–F6 | Pitch (30 s) |
|------|----------|----------------|-----------|--------------|
| **Alpha** | `usercase-mvp-microphone-alpha` | ✅ apply, 3 fn, Act I–II groups | ❌ errors at Run *(deferred)* | «Три акта спектакля» |
| **Beta** | `usercase-mvp-microphone-beta` | ✅ apply, 3 fn orchestrator | ❌ errors at Run *(deferred)* | «Main = оркестратор» |
| **Gamma** | `usercase-mvp-microphone-gamma` | ✅ apply, poster ①–⑤ | ❌ errors at Run *(deferred)* | «Плакат без mental scroll» |
| **MVP ref** | `usercase-mvp-microphone` | ✅ bundled | ✅ baseline | инженерный чертёж |

**Решение consilium:** голосование по **упаковке canvas** (C2–C5, C4); C1 и demo Run помечены «validation deferred» — общий tech debt collapse→runtime, не различие команд.

---

## Team Alpha — summary

**Thesis:** Live Observation Pipeline — operator journey, audio as partiture.

### Strengths

- RU narrative: Акт I (onConnect/initial) + Акт II (Policy · Gate · Observation · Journal)
- `fn-alpha-bootstrap` — единственная команда, collapse bootstrap onConnect
- Audio units в descriptions («5 s WAV», trends-fft) — Musican clarity
- Баланс onboarding (initial open) vs density (functions on main)

### Weaknesses

- Main ~15 nodes — между beta orchestrator и gamma poster
- ADR A2 (единый observation heartbeat) частично: gate и trends — **две** functions, не одна
- Run parity не доказан (как у всех sprint forks)

### Rebuttal (Team Alpha)

«Мы сознательно оставили initial развёрнутым — новичок видит mic/stream до collapse. Run починим одним pin-audit после выбора narrative-победителя.»

---

## Team Beta — summary

**Thesis:** Measured modular UserCase — beauty = metrics + reusable blocks.

### Strengths

- Полная декomposition: policy / gate / trends — **клонируемые** function templates
- `computeTeamPackLayoutMetrics` + verify-layout CI — объективный C3
- Чистый orchestrator spine — лучший C2/C5 для следующих авторов UserCase
- Соответствует Ozhegov: слабая связанность, document-only delivery

### Weaknesses

- Operator UX «инженерная карта» — проигрывает gamma на 30-sec explain
- Main node count ~15 vs target ≤6
- Run errors (shared collapse debt)

### Rebuttal (Team Beta)

«Соревнование в brief — упаковка + maintainability. Мы выигрываем там, где продукт через полгода скажет спасибо: modularity и CI metrics.»

---

## Team Gamma — summary

**Thesis:** Poster UserCase — canvas как одностраничный плакат ①–⑤.

### Strengths

- Лучший **C4**: numbered steps, verb-first RU, DESIGN.md palette
- Минимум functions (2) — меньше pin surface vs mega-bundle
- Prep groups onConnect/initial — muted «Подготовка»
- Лучший кандидат для docs screenshot / onboarding

### Weaknesses

- Несколько poster frames на один function block (visual overlap)
- Mega-bundle отложен (D-PINS-9) — vision vs implementation gap
- Run errors (shared)

### Rebuttal (Team Gamma)

«Оператор не обязан открывать function — плакат достаточен. Run — инженерная доводка, не отмена poster metaphor.»

---

## Cross-cutting themes

| Theme | Alpha | Beta | Gamma |
|-------|-------|------|-------|
| Functions | 3 (bootstrap + gate + trends) | 3 (policy + gate + trends) | 2 (gate + trends) |
| Comment groups | 6 (4 main + 2 Act I) | 4 engineering | 7 (5 poster + 2 prep) |
| Operator metaphor | Theatre acts | Orchestrator | Poster steps |
| Author reuse | Medium | **High** | Low |
| 30-sec explain | Strong | Weak | **Strongest** |

---

## Журnal реплик (полный протокол)

[Teamlead — Vesnin]: Sprint закрываем по **упаковке**. Run на всех трёх forks падает — это **общий** collapse/runtime debt, не повод отменять голосование. Phase 5 merge **откладываем** до pin-audit; победитель получает право на merge + polish. MVP bundled остаётся production reference.

[Структурщик — Ozhegov]: Beta — эталон для **следующих UserCase**: три function с явными границами, без client hacks. Alpha bootstrap function — хорошая идея, cherry-pick в winner branch. Gamma poster groups — UI-слой, не runtime.

[Математик — Dynin]: verify-layout green ×3 — доказательство аккуратности layout. Beta metrics (~15 main nodes, 3 blocks) — единственная команда с **измеримым** orchestrator story. Run validation — отдельный spike: graph equivalence test collapsed vs MVP flat.

[Музыкант]: Alpha выигрывает **audio causality** в copy: gate 5 s, stream, trends publish в одной narrativa. Gamma poster хорош для «что делает продукт», Alpha — для «как течёт звук». Beta — для инженера, не для оператора поста.

[Верстальщик — Rodchenko]: Gamma ①–⑤ — лучший **first screen** для device-board demo. Рекомендация победителю: взять beta skeleton + gamma titles + alpha RU Act descriptions. DESIGN.md presets соблюдены у всех; gamma — самый «продуктовый» screenshot.

---

## Pre-vote consensus (binding for Phase 5 prep)

1. **Merge winner** = beta document path; polish PR cherry-picks gamma numbered titles + alpha Act I copy.
2. **Run fix** = отдельная задача до merge в `main`/`techies68` (не блокирует объявление победителя).
3. **Community tier** = sprint preview only; не bundled в production без LGTM.
4. Сохранить `yarn usercase:verify-layout` gate.

---

## Known issue (post-sprint)

| ID | Issue | Owner |
|----|-------|-------|
| RUN-01 | Apply alpha/beta/gamma → Run errors (function pin / exec bridge) | device-board runtime |
| RUN-02 | Collapse programmatic vs editor marquee — parity audit | Vesnin + Ozhegov |

*Не участвует в weighted score Phase 4 — зафиксировано для follow-up.*
