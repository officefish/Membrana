# CLOSURE — bestiary-workshop

| Field | Value |
|-------|-------|
| Epic | `bestiary-workshop` · [#945](https://github.com/officefish/Membrana/issues/945) |
| Date | 2026-07-22 |
| Sprint OPEN | [`OPEN.md`](./OPEN.md) |
| Status | **CLOSED** |
| Seed | [`storm-bestiary-workshop-2026-07-22`](../../storm/storm-bestiary-workshop-2026-07-22/REPORT.md) · T1–T18 |
| Home | [`docs/audit/bestiary/`](../../audit/bestiary/) (#878 CLOSED) |
| Patterns | [`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) · [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) |
| Kit | [`kits/witcher/`](../../../kits/witcher/) · human-label «Ведьмак» |

## Сделано

| Фаза | Issue | PR | Артефакт | Archive |
|------|------:|----:|----------|---------|
| W0 | #946 | [#952](https://github.com/officefish/Membrana/pull/952) · `c1f067a7` | OPEN + ACTIVE + Issues #945–#951 | archived |
| W1 | #947 | [#954](https://github.com/officefish/Membrana/pull/954) · `496ecb41` | `workshop.manifest` + K25-B + `issueTrap` | archived |
| W2 | #948 | [#965](https://github.com/officefish/Membrana/pull/965) · `7887ad73` | CATCH/TRAPS + antipattern stub | archived |
| W3 | #949 | [#967](https://github.com/officefish/Membrana/pull/967) · `ed997ce1` | thin Mintlify mirror `apps/docs/bestiary/` | archived |
| W4 | #950 | [#978](https://github.com/officefish/Membrana/pull/978) · `e1a6eafb` | `kits/witcher` + aim «Ведьмак» | archived |
| W5 | #951 | _(this PR)_ | CLOSURE + ACTIVE cleared | after merge |

## DoD эпика (матрица)

| Критерий | Свидетельство |
|----------|---------------|
| Мастерская = **поставщик** ловушек; шов HOME_WORKSHOP явный | K25-B · `issueTrap` · таблица реализаций паттерна |
| Доп. реестры улова/ловушек; `BESTIARY_LIST` не подменён | `registry/CATCH_LIST.md` · `TRAPS_LIST.md` · `traps/` |
| Формат T17 + ≥1 пример | stub улова + `silent-empty-catch` |
| Антипаттерн = шаблон; kit пинит ловушку | `antipatterns/silent.md` вне pins · `kits/witcher` |
| Mintlify = монитор; истина = git | overview + catch + trap · лемма в README дома |
| Жилец кита + audit green + aim | `kits/witcher` · `yarn kits:audit --id witcher` blocking=0 |
| CLOSURE + ACTIVE + archive | этот файл · ACTIVE cleared · archive W5+epic после merge |

## Sanity (W5)

Прогон на HEAD перед merge W5:

| Команда | Результат |
|---------|-----------|
| `yarn bestiary:audit --no-write` | 5/5 covered |
| `yarn kits:audit --id witcher` | blocking=0 · pins=4 |

## Handoff / follow-up

| Что | Куда |
|-----|------|
| Полный каталог ловушек на все классы BESTIARY | отдельные поставки `issueTrap` после эпика |
| Доп. Mintlify-страницы (не thin) | follow-up; pin-манифест как #823 F4 — out of sprint |
| Новые детекторы / `goal-displacement` | `bc-followup-goal-displacement` / отдельные M |
| Автофикс прод | #533 — запрет |
| Внешний mintlify-community sync | только с ok владельца |

## Archive

W0–W4 уже archived. После merge этого PR: `yarn task:archive bw-w5-closure` +
`yarn task:archive bestiary-workshop` со свидетельством PR.
