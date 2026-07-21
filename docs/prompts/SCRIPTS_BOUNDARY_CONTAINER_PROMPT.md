# Промпт: Эпик — граница scripts/ (GROUP_CONTAINERIZATION в одном доме)

> **Task-промпт.** Размер: **L** (эпик). Реестр: `scripts-boundary-container`.
> LeadPersona: **ozhegov**. Support: dynin, vesnin.
> OPEN: [`docs/day-sprint/scripts-boundary-container-2026-07-21/OPEN.md`](../day-sprint/scripts-boundary-container-2026-07-21/OPEN.md).

---

## Контекст

Группа скриптов уже живёт в `scripts/` (~сотни `.mjs`, ритуал дня/вечера). Нужны органы
паттерна GROUP_CONTAINERIZATION **без второго дома**. Ядро версионирования kits —
GitHub Releases; контракт манифеста кита — у соседнего `pl-r3-boundary`, не здесь.

Отдельный (не блокирующий S0–S2) research-трек: отказоустойчивость ритуальных цепочек
без оркестратора — см. вопросы Q1–Q3 ниже (рамка владельца 17.07).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`scripts/README.md`](../../scripts/README.md) | Контракт контейнера |
| [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) | Органы 1–8 |
| [`UNITS_DICTIONARY.md`](../tasks/UNITS_DICTIONARY.md) | Единицы учёта |
| `pl-r3-boundary` | Kit-manifest + layer direction |

---

## Промпт целиком

### Кто ты

Координатор виртуальной команды. Эпик режется на фазы `sbc-s0`…`sbc-s4`; каждая фаза —
своя карточка и свой `leadPersona`. **Ответственность = принятие выхода**, не набор текста.

### Что построить (по фазам)

| Фаза | Lead | Артефакт |
|------|------|----------|
| S0 | ozhegov | README + AGENT_PROMPT + cache |
| S1 | dynin | derived `registry/SCRIPTS_LIST.md` |
| S2 | vesnin | `--report` в контейнер |
| S3 | ozhegov | align kits ↔ pl-r3 (не свой контракт) |
| S4 | vesnin | AGENTS / skills wiring |

### Запрещено

- Второй дом (`docs/audit/scripts/` и т.п.).
- Параллельный kit-формат в обход pl-r3.
- Считать research Temporal обязательным DoD контейнерных органов.

### Definition of Done (эпик)

- [ ] Все фазы S0–S4 закрыты или явно deferred со свидетельством.
- [ ] Чеклист GROUP_CONTAINERIZATION в `scripts/README` без «молчаливых» ⚠ без причины.
- [ ] Нет второго дома; SoT назван.
- [ ] LGTM Teamlead на эпик.

### Out of scope эпика (отдельный трек)

Внедрение Temporal/Airflow; полный lint/tsconfig для всего `scripts/` «за одну фазу».

---

## Acceptance criteria

- [ ] Фазы S0–S4 имеют Issues и leadPersona; закрываются поштучно со свидетельством
- [ ] `scripts/` — единственный дом; SoT = ФС + yarn names
- [ ] S3 не плодит параллельный kit-контракт (только align с pl-r3)
- [ ] Research Temporal — не блок DoD органов контейнера

## Заметки для человека-постановщика

1. Фазы стартовать через `yarn task:start` (свой Issue на фазу).
2. S3 не начинать до ясности контракта pl-r3.
3. После merge фаз — `yarn task:archive` поштучно.

---

## Вопросы для research (Q1–Q3)

> Рамка владельца 17.07. Не про «нужны ли скрипты» и не про упаковку контейнера.
> Тема: **отказоустойчивость** бизнес-процессов, исполняемых цепочкой Node-скриптов.

1. **Landscape:** Что движки долговечного исполнения (Temporal, Airflow, Dagster, Prefect) и BPM считают обязательным для шага процесса (отказ, идемпотентность, ретраи, журнал, наблюдаемость, версионирование определения)? Что команды переносят в голые shell/Node-скрипты без оркестратора?
2. **Fit (Membrana):** Цепочки `&&` / `|| true`, датированные артефакты ритуала, инцидент «вчерашний отчёт под сегодняшней датой». Минимальный набор свойств без оркестратора; порог «пора брать Temporal».
3. **Risk:** Нужно ли версионировать определение дневного процесса vs дата артефакта + гейт свежести; режимы отказа «автоматизация = процесс».
