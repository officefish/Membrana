# Промпт: Эпик: слой kits/ + первый кит angelina-morning

> **L** · `kits-angelina-morning` · [#814](https://github.com/officefish/Membrana/issues/814) · lead **vesnin**
> Цепь: K0→K5 (#815–#820). Семя: [#761](https://github.com/officefish/Membrana/issues/761).
> Паттерн: [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md).
> Дом кода скриптов: `scripts/` · дом китов: `kits/` (layer-rules rank 1).

---

## Контекст

DLC контейнера **scripts/** (не `docs/audit/git/`): уметь собирать **киты** —
виртуальные наборы скриптов с версией по пинованному подграфу. Первый жилец —
секретарь **Ангелина**: достаточно инструментов, чтобы подготовить день к утру и
запустить `ritual:day`. Прецеденты: `docs/precedents/2026-07-21-morning-ritual-*`.

Соседство: `sbc-s3-kits-align` (#795) — выровнять контракт, не плодить второй
JSON-остров; `pl-r3` (#808) уже дал layer-rules + kit-manifest адрес; продукт
доклада утра — `morning-report-completion` (#788), кит пинит готовое и оставляет
слоты.

## Фазы

| Фаза | id | Issue | lead |
|------|-----|------:|------|
| K0 | `kam-k0-brief` | #815 | vesnin |
| K1 | `kam-k1-home` | #816 | ozhegov |
| K2 | `kam-k2-audit` | #817 | dynin |
| K3 | `kam-k3-first-kit` | #818 | angelina |
| K4 | `kam-k4-wire` | #819 | ozhegov |
| K5 | `kam-k5-closure` | #820 | vesnin |

## Состав кита angelina-morning (черновик корней)

`morning-care` · `worktree-sync` · `repo-clean` · `deps-watch` · `plan-week-if-monday` ·
`strategy-day` · `daily-standup` · `main-day-probe` · `main-day-issue` · `angelina` ·
`morning-gate` · `telegram-swallow` · `hermes-brief` (+ day-report / report-lens по готовности).

## Out of scope

- Реализация в `docs/audit/git/`
- Ценностный доклад утра (#788) — соседний спринт
- `repo:clean --execute` без ok

## Acceptance (эпик)

- [ ] `kits/` дом + манифест по pl-r3
- [ ] Аудит полноты подграфа (PINNED_SUBGRAPH чеклист)
- [ ] Живой кит `angelina-morning` с пинами
- [ ] Процедура утра / `kitVersion` связана
- [ ] Фазы архивированы со свидетельством PR
