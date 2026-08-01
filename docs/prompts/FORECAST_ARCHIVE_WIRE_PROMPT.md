# Промпт: Провод памяти персоны — запись «предсказание ↔ исход» доезжает в `archive/<persona>.jsonl`

> **M** · `forecast-archive-wire` · [#1590](https://github.com/officefish/Membrana/issues/1590) · lead **dynin** · support **vesnin**, **ozhegov**
> Долг-родитель: `#forecast-record-no-wire-to-archive` (заведён 30.07, `docs/bridge/DEBTS.md`).
> Нарезка: [`docs/sprint/cut/forecast-archive-wire.json`](../sprint/cut/forecast-archive-wire.json), ратифицирована 01.08.

## Контекст

Слово владельца 30.07: «персона должна запоминать свои промахи, надеюсь она это уже умеет».
Не умеет. Четвёртый род записи памяти — «моё предсказание ↔ его исход», два момента времени
и deep-freeze поля `predicted` — **построен полностью** блоком `experience-loop` коворка:
`scripts/lib/sprint-experience/forecast-record.mjs` несёт `makeForecastRecord`,
`validateForecastRecord`, `checkAppendOnly`, подвиды `cut` и `stop`.

Не построен **провод**. Род пишет в `docs/sprint/experience/forecast-records.jsonl`, а этот
путь стоит в `.gitignore:185`. Сам блок объявил, что настоящий дом —
`docs/virtual-team/memory/archive/<persona>.jsonl`, но адаптер туда остался N-хвостом Phase 4.

**Замер на 01.08, а не пересказ карточки.** В архиве **1456 записей: 1296 `position` +
160 `routine`**. Записей о предсказании и об исполнении — **ноль**. За двое суток с момента
заведения долга `position` прибавил 130: архив не просто однороден, он однороден и растёт так
дальше. Две записи рода, проведённые руками 30.07, **не сохранились** — греп по
`docs/virtual-team/memory/` не находит ничего, содержание уцелело только в тексте долга.

**Находка сверх карточки:** архивов `tarasov.jsonl` и `angelina.jsonl` **не существует**.
В `archive/` лежат только `dynin`, `kuryokhin`, `ozhegov`, `rodchenko`, `vesnin` — а петля
опыта именно про этих двоих: тимлид предсказывает нарезку, ведущая — остановки.

**Шов `class`/`kind` объявлен нерешённым и таковым НЕ является.** В живой записи это
ортогональные поля: `kind` ∈ {`verbatim`, `summary`} описывает форму текста, `class` описывает
род (`position`, `routine`). `recordProblems` в `archive-schema.mjs` валидирует `kind` и
**не валидирует `class` вовсе**. Вердикт M8 предлагал `kind: execution` — это столкнулось бы
с формой. Модуль рода уже выбрал `class: 'forecast'`, и это единственно совместимый выбор.
Консилиум не нужен; нужно записать разбор и идти дальше.

**Что не трогаем:** сам род записи (построен и проверен), `.gitignore` (промежуточный журнал
остаётся промежуточным), схему архива (`class` она не ограничивает — расширять нечего).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`docs/bridge/DEBTS.md`](../bridge/DEBTS.md) | карточка долга-родителя, вещдоки 30.07 |
| [`docs/sprint/experience/FORECAST_RECORD.md`](../sprint/experience/FORECAST_RECORD.md) | форма четвёртого рода |
| [`docs/virtual-team/memory/archive/README.md`](../virtual-team/memory/archive/README.md) | контур архива персон |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** [#1590](https://github.com/officefish/Membrana/issues/1590)

## Что сделать

1. **Адаптер** `scripts/lib/sprint-experience/forecast-to-archive.mjs` — чистая функция
   `forecast-запись → запись архива`. Вход: валидная forecast-запись; выход: запись с
   обязательными полями `id`, `personaId`, `ts`, `provenance`, `source`, `kind`, `text` и
   `class: 'forecast'`. Ни fs, ни сети внутри.
2. **Проводка** в `scripts/sprint-experience.mjs`: при закрытии окна запись едет в архив
   автора через существующий `appendArchive`. Архива автора может не быть — завести, а не
   упасть и не промолчать.
3. **Наполнение живым прогоном**: две записи 30.07 из карточки долга и два замера 01.08
   (спринт `weekly-dead-wire-audit`: прогноз 650 → факт 663 при +50% на плотном блоке;
   шот `dead-wire-catalogs`: прогноз 150 → факт 236). Класть **через построенный провод**,
   не руками — это вещдок включения по норме [#1565](https://github.com/officefish/Membrana/issues/1565).
4. **Долг закрыть или понизить** записью в `docs/bridge/DEBTS.md` со ссылкой на PR.

## DoD

- [ ] Зуб падает **до** провода: архив автора не содержит ни одной записи `class=forecast` —
      красный доказан прогоном, а не рассуждением (зверь B6 «Молчаливый зелёный»)
- [ ] `predictedAt < observedAt` сохраняется при переносе; правка `predicted` после исхода
      невозможна механически (deep-freeze не теряется на границе адаптера)
- [ ] append-only архива не нарушен: `appendMonotonic` принимает результат
- [ ] Запись проходит `recordProblems` без замечаний и читается `parseArchive`
- [ ] Архив автора заводится, если его нет; отсутствие архива — не молчаливый пропуск
- [ ] После прогона в `tarasov.jsonl` и `angelina.jsonl` лежат записи `class=forecast`,
      число названо цифрой
- [ ] Юнит-тесты обоих путей: автор с архивом · автор без архива

## Out of scope

- Чтение памяти при подготовке персоны (магистраль «память пишется и не читается» — шире
  этой задачи; здесь строится только сторона записи).
- Вытеснение и пороги важности: `importanceSnapshot` берётся как есть.
- Перенос промежуточного журнала из `.gitignore` в трекинг.
- Номинация лучших прогонов в канон (`RUN_NOMINATIONS.md`) — отдельный предмет.

### Проверка после PR

```bash
node --test scripts/lib/sprint-experience/forecast-to-archive.test.mjs
node scripts/sprint-experience.mjs --record <прогон>
node -e "const fs=require('fs');for(const p of ['tarasov','angelina'])console.log(p, fs.readFileSync('docs/virtual-team/memory/archive/'+p+'.jsonl','utf8').trim().split('\n').filter(l=>JSON.parse(l).class==='forecast').length)"
```
