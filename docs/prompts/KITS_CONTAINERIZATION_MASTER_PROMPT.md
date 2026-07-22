# Промпт: Эпик: кит Мастера контейнеризации

> **L** · `kits-containerization-master` · [#904](https://github.com/officefish/Membrana/issues/904) · lead **vesnin** · pin owner **ozhegov**  
> Цепь: C0→C4 (#905–#909). Семя паттернов: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) ·
> [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md) (#761).  
> Прецедент жильцов: `kits-angelina-morning` (#814), `kits-dream-master` (#855).  
> Автор крафта: [`CONTAINERIZATION_MASTER_PROMPT.md`](./CONTAINERIZATION_MASTER_PROMPT.md).  
> OPEN: [`docs/day-sprint/kits-containerization-master-2026-07-22/OPEN.md`](../day-sprint/kits-containerization-master-2026-07-22/OPEN.md).

---

## Контекст

Владелец хочет **контейнеризировать** группы (в т.ч. достраивать слой процедур) так же,
как уже сделаны git / tasks / scripts / bestiary — и уметь **стартовать с холодной
сессии**. Для этого нужен кит: полный контекст двух паттернов + уроки живых домов +
пинованный набор инструментов аудита/реестров.

Дом `kits/` и зуб `yarn kits:audit` **уже в main** — не повторяем K1/K2 angelina.

## Границы (C0)

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом кода** | плоский [`scripts/`](../../scripts/) | код в `kits/` |
| **Дом кита** | [`kits/containerization-master/`](../../kits/containerization-master/) | `docs/audit/git/pins/` (Mintlify) |
| **Контекст крафта** | `CONTAINERIZATION_MASTER_PROMPT.md` + skill | пины `.md` (нельзя / слепая зона) |
| **Процедура** | [`docs/procedures/containerization/`](../procedures/containerization/) · `kitVersion` | инстансы day-sprint |
| **Owner пина** | **ozhegov** | lead эпика = vesnin |
| **Режимы** | interactive → latest; reproducible craft → pinned | |

**Запрещено в эпике:**

- Пинить контейнер целиком / нарушать вердикт «контейнеры вне PINNED_*».
- Глотать спринт `procedure-frames` (#900) — `frames[]` и пин **отрезков** ортогональны.
- Плодить второй schema-остров под `scripts/`.
- Переписывать ACTIVE чужого day-sprint.

**Соседство:**

| Сосед | Правило |
|------|---------|
| `procedure-frames` (#900) | ozhegov; не пересекать Ф1–Ф4 frames |
| `angelina-morning` / `dream-master` | потребляем дом/аудит |
| `scripts-boundary-container` (#791) | один дом scripts |
| `bestiary-container` (#878) | свой эпик |
| #761 | третий жилец PINNED_*; комментарий в C4 |

## Фазы

| Фаза | id | Issue | lead | Суть |
|------|-----|------:|------|------|
| C0 | `kcm-c0-brief` | [#905](https://github.com/officefish/Membrana/issues/905) | vesnin | бриф + LGTM границ (этот файл) |
| C1 | `kcm-c1-prompt` | [#906](https://github.com/officefish/Membrana/issues/906) | ozhegov | `CONTAINERIZATION_MASTER_PROMPT` + cold-start порядок |
| C2 | `kcm-c2-kit` | [#907](https://github.com/officefish/Membrana/issues/907) | ozhegov | жилец `kits/containerization-master/` + pins; `kits:audit` green |
| C3 | `kcm-c3-wire` | [#908](https://github.com/officefish/Membrana/issues/908) | ozhegov | процедура `containerization` + skill + строка в `kits/README` |
| C4 | `kcm-c4-closure` | [#909](https://github.com/officefish/Membrana/issues/909) | vesnin | CLOSURE + archive + комментарий #761 |

## Состав кита (C2 — утверждено черновиком)

### Roots

`kits-audit` · `check-layer-direction` · `procedures-registry` · `scripts-registry` ·
`tooling-overview` · `repo-branches` · `repo-branches-decompose` · `tasks-decompose` ·
`tasks-audit`.

Транзитивы `scripts/lib/*` — в `pins` замыканием, не отдельные roots.

### Вне кита

| Что | Куда |
|-----|------|
| Паттерны + master prompt | precedents процедуры |
| AGENT_PROMPT целевых контейнеров | дома контейнеров |
| Mintlify branch-instructions pin | `docs/audit/git/pins/` |
| `frames[]` / пин отрезков | sprint #900 |

## Out of scope

- Полная достройка органов `docs/procedures/` до audit-parity (AGENT_PROMPT/cache) —
  **следующий** день после кита; этот эпик только оснащает Мастера.
- Новые детекторы bestiary / правка git Scenario B.
- GitHub Releases раздачи.

## Acceptance (эпик)

- [ ] Жилец `kits/containerization-master/` · `yarn kits:audit --id containerization-master` = 0 blocking
- [ ] `CONTAINERIZATION_MASTER_PROMPT.md` с версией + cold-start
- [ ] Процедура `docs/procedures/containerization/` · `kitVersion` → кит · `validateProcedure` green
- [ ] Skill `membrana-containerization-master` (+ `.claude` mirror)
- [ ] `kits/README.md` таблица жильцов обновлена
- [ ] Фазы архивированы со свидетельством PR
