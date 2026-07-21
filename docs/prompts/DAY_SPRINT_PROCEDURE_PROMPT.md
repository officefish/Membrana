# Промпт: Эпик — процедура day-sprint → жилец procedures/

> **L** · `day-sprint-procedure` · [#848](https://github.com/officefish/Membrana/issues/848) · lead **vesnin**  
> Цепь: F0→F5 (#849–#854).  
> Канон дома: [`docs/procedures/README.md`](../procedures/README.md) · образец [`ritual-evening/`](../procedures/ritual-evening/).  
> OPEN: [`docs/day-sprint/day-sprint-procedure-2026-07-21/OPEN.md`](../day-sprint/day-sprint-procedure-2026-07-21/OPEN.md).

---

## Контекст

Day-sprint сегодня размазан: `sprintKind` + `task:start`/`archive`, skill
`membrana-task-lifecycle`, указатели ACTIVE/LOG, инстансы в `docs/day-sprint/<id>/`.
Отдельной **процедуры** в доме `docs/procedures/` нет; нет и
`DAY_SPRINT_REGULATION.md` (у night/cowork/meeting регламенты есть).

Эпик: завести жильца **`day-sprint`** — определение (класс), не перенос прогонов.

## Границы (F0)

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Определение** | `docs/procedures/day-sprint/` (README + MANIFEST) | инстансы `docs/day-sprint/<id>/` |
| **Движки** | плоский `scripts/` (`task:*` …) через `engines[]` | код внутри procedures/ |
| **kitVersion** | `null` в этом эпике | колонизация `kits/` (#814) |
| **Реестр процедур** | мягкий стык с `pl-r5-migration` (#786) | блокер жильца; если R5 нет к F4 — `⚠ deferred` |
| **Форматы** | только **day-sprint** | competition / cowork / night / storm / meeting |

**Запрещено:** переносить OPEN/CLOSURE инстансов в procedures; плодить
`yarn day-sprint:open/close` без отдельного follow-up после F1; трогать грамматику
Р4 и Mintlify-ветки (#823 закрыт).

## Фазы

| Фаза | id | Issue | lead | Суть |
|------|-----|------:|------|------|
| F0 | `dsp-f0-brief` | #849 | vesnin | границы, OPEN, DoD эпика |
| F1 | `dsp-f1-inventory` | #850 | ozhegov | инвентарь canon/engines/precedents/gaps |
| F2 | `dsp-f2-home` | #851 | ozhegov | жилец README + MANIFEST; validateProcedure |
| F3 | `dsp-f3-regulation` | #852 | ozhegov | `DAY_SPRINT_REGULATION.md` (или явный отказ в README) |
| F4 | `dsp-f4-wire` | #853 | ozhegov | skill / ACTIVE/LOG / CONTRIBUTING ± R5 migrated |
| F5 | `dsp-f5-closure` | #854 | vesnin | CLOSURE + archive |

## Acceptance (эпик)

- [ ] Жилец `docs/procedures/day-sprint/` валиден CI
- [ ] Канон day-sprint назван (regulation или обоснованный отказ)
- [ ] Провода: skill + CONTRIBUTING указывают на процедуру
- [ ] Инстансы остались в `docs/day-sprint/<id>/`
- [ ] Фазы архивированы со свидетельством PR

---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
