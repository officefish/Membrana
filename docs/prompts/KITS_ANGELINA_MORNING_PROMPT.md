# Промпт: Эпик: слой kits/ + первый кит angelina-morning

> **L** · `kits-angelina-morning` · [#814](https://github.com/officefish/Membrana/issues/814) · lead **vesnin**  
> Цепь: K0→K5 (#815–#820). Семя: [#761](https://github.com/officefish/Membrana/issues/761).  
> Паттерн: [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md).  
> OPEN: [`docs/day-sprint/kits-angelina-morning-2026-07-21/OPEN.md`](../day-sprint/kits-angelina-morning-2026-07-21/OPEN.md).

---

## Контекст

DLC контейнера **scripts/**: уметь собирать **киты** — виртуальные наборы скриптов
с версией по пинованному подграфу. Первый жилец — секретарь **Ангелина**: достаточно
инструментов, чтобы подготовить день к утру и запустить `ritual:day`.
Прецеденты: `docs/precedents/2026-07-21-morning-ritual-*`.

## Границы (K0 — зафиксировано)

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом кода движков** | плоский [`scripts/`](../../scripts/README.md) | audit-контейнеры |
| **Дом китов** | [`kits/`](../../kits/) (создаётся в **K1**; rank 1 в `layer-rules.json`) | `docs/audit/git/`, `docs/audit/scripts/` |
| **Контракт манифеста** | канон pl-r3 (#808) + выравнивание sbc-s3 (#795 / #822) | второй `kits.schema.json` «временно» |
| **Версия единицы** | манифест `path → SHA` ([`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md), #761) | пин одного файла; копии |
| **Пин с процедуры** | `MANIFEST.json` поле `kitVersion` → кит | дублировать весь список в `engines[]` без нужды |
| **Режимы** | interactive → **latest**; autonomous (night/cron/office) → **pinned** | `repo:clean --execute` без ok владельца |

**Запрещено в эпике:** реализовывать киты внутри `docs/audit/git/`; плодить второй
схемный остров под `scripts/`; подменять ценностный доклад утра (#788).

**Соседство (скоуп):**

| Сосед | Правило |
|------|---------|
| `scripts-boundary-container` / sbc-s3 (#795) | контракт уже выровнен; K1 **потребляет**, не изобретает |
| `pl-r3-boundary` (#808) | layer-rules + адрес kit-manifest |
| `morning-report-completion` (#788) | продукт доклада — сосед; кит пинит готовое и оставляет слоты |
| #761 | семя паттерна; комментарий в K5 со ссылкой на первый жилец |

## Фазы

| Фаза | id | Issue | lead | Суть |
|------|-----|------:|------|------|
| K0 | `kam-k0-brief` | #815 | vesnin | границы + DoD эпика (этот бриф) |
| K1 | `kam-k1-home` | #816 | ozhegov | `kits/` README + схема манифеста (потребить pl-r3) |
| K2 | `kam-k2-audit` | #817 | dynin | зуб полноты подграфа path→SHA |
| K3 | `kam-k3-first-kit` | #818 | angelina | жилец `kits/angelina-morning/` |
| K4 | `kam-k4-wire` | #819 | ozhegov | процедура утра / `kitVersion` |
| K5 | `kam-k5-closure` | #820 | vesnin | CLOSURE + archive + #761 |

## Состав кита angelina-morning (черновик корней)

`morning-care` · `worktree-sync` · `repo-clean` · `deps-watch` · `plan-week-if-monday` ·
`strategy-day` · `daily-standup` · `main-day-probe` · `main-day-issue` · `angelina` ·
`morning-gate` · `telegram-swallow` · `hermes-brief` (+ day-report / report-lens по готовности).

Транзитивные `scripts/lib/*` и конфиги входят в подграф манифеста (K2/K3), не в этот список корней.

## Out of scope

- Реализация в `docs/audit/git/`
- Ценностный доклад утра (#788) — соседний спринт
- `repo:clean --execute` без ok
- GitHub Releases как обязательный шаг K1–K4 (ядро раздачи — позже; пины = git SHA)

## Acceptance (эпик)

- [ ] `kits/` дом + манифест по pl-r3
- [ ] Аудит полноты подграфа (PINNED_SUBGRAPH чеклист)
- [ ] Живой кит `angelina-morning` с пинами
- [ ] Процедура утра / `kitVersion` связана
- [ ] Фазы архивированы со свидетельством PR
