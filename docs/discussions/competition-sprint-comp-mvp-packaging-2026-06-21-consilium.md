# Consilium: Competition Sprint — MVP UserCase упаковка

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-packaging-2026-06-21` |
| **brief** | [`COMPETITION_SPRINT_BRIEF.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_SPRINT_BRIEF.md) |
| **phase** | 3 — structured comparison (no winner yet) |
| **date** | 2026-06-21 |

---

## Demo recap

Единый demo script (brief): Settings → UserCase → apply → Run ≥45 ticks → track + `trends-fft/v0.1` → Stop.

| Team | UserCase | Phase 2β | CI | Operator pitch (30 s) |
|------|----------|----------|-----|------------------------|
| **Alpha** | `usercase-mvp-microphone-alpha` | 3 functions, Act I groups onConnect/initial | 393 tests device-board | «Три акта: подключение → live gate+observation → stop» |
| **Beta** | `usercase-mvp-microphone-beta` | 3 functions orchestrator | verify-layout metrics | «Main = оркестратор из 3 function blocks, exec LR монотонен» |
| **Gamma** | `usercase-mvp-microphone-gamma` | 2 functions, poster ①–⑤ | verify-layout green | «Плакат: шаги ①–⑤ без mental scroll» |

---

## Team Alpha — summary

### Strengths

- RU operator journey (Акт I–II), bootstrap function on onConnect
- Gate + observation split — audio causality в group descriptions
- Catalog `community` entry для picker demo

### Weaknesses

- Main ещё dense vs gamma poster (≈15 scenario nodes)
- Bootstrap только onConnect (initial остаётся развёрнутым — по ADR A4)

### Open questions

- Достаточно ли 3 functions vs beta «чистый оркестратор»?

---

## Team Beta — summary

### Strengths

- Полная модульность: policy / gate / trends — переиспользуемые blocks
- Измеримый layout (`computeTeamPackLayoutMetrics`, verify-layout CI gate)
- 3 subgraph blocks на main — явный orchestrator spine

### Weaknesses

- Визуально «сухо» vs gamma poster
- Main node count ~15 (target ≤6 aspirational не достигнут)

### Open questions

- Стоит ли policy function перенести на initial (B3 alternative)?

---

## Team Gamma — summary

### Strengths

- Numbered poster groups ①–⑤, prep frames onConnect/initial
- Минимум function count (2) при читаемом main
- Сильный C4 UX / screenshot potential

### Weaknesses

- Mega-bundle отложен (D-PINS-9) — complexity inside 2 functions
- Несколько poster groups ссылаются на один function block (overlap frames)

### Open questions

- Poster vs orchestrator — что важнее для оператора микрофонного поста?

---

## Cross-cutting themes

| Theme | Alpha | Beta | Gamma |
|-------|-------|------|-------|
| User functions | 3 (bootstrap + gate + trends) | 3 (policy + gate + trends) | 2 (gate + trends) |
| Comment groups main | 4 RU narrative | 4 engineering map | 5 numbered poster |
| Bootstrap visibility | onConnect collapsed + initial open | all on main path | prep groups only |
| Catalog tier | community | community | community |

---

## Журнал реплик

*(Phase 3 live / async — append below)*

[Teamlead — Vesnin]: Phase 2β DoD закрыт на ветке alpha для всех трёх UserCase id. Runtime parity сохранён — только document + scripts. Готовы к demo и голосованию.

[Структурщик — Ozhegov]: Beta выигрывает на C2/C5 modularity; границы пакетов не нарушены.

[Математик — Dynin]: verify-layout green ×3; beta metrics documentable. C3 — beta/alpha tie.

[Музыкант]: Alpha RU copy с audio units («5 s WAV») лучше для F2–F4 operator clarity.

[Верстальщик — Rodchenko]: Gamma poster ①–⑤ — лучший C4 для нового оператора за 30 секунд.

---

## Pre-vote consensus (non-binding)

- Победитель merge **только** document/scripts path — без client hacks
- Сохранить `yarn usercase:verify-layout` gate для bundled/community UserCases
- Optional cherry-pick: gamma numbered titles + alpha RU Act copy в winner polish PR
