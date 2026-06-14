# Промпт: Detection — Single-Node freeze в ARCHITECTURE

> **Task-промпт** · `detection-architecture-freeze` · размер **S** · **1 PR**  
> Родитель: [#47](https://github.com/officefish/Membrana/issues/47)  
> Реестр: `detection-architecture-freeze`

---

## Контекст

§1e в `ARCHITECTURE.md` частично описывает Single-Node First. Нужны **явный freeze** многоузловых пакетов и PR-чек-лист до stage-gate 1→2.

---

## Промпт целиком

### Что построить

1. Расширить `docs/ARCHITECTURE.md` §1e:
   - frozen: `tdoa-service`, `localizer-service`, `tracker-service`, `transport-service` до gate;
   - ссылка на `DETECTOR_BENCHMARK.md` как критерий разморозки.
2. `.github/pull_request_template.md` (или дополнение) — чек «не добавляет TDOA/multi-node до gate».
3. Обновить/создать `docs/seanses/single-node-detection-first-2026-06-10.md` (краткий memo).

### DoD

- [ ] Freeze перечислен явно; статусы детекторов актуальны.
- [ ] PR template с чек-листом stage-gate.
- [ ] `yarn task:archive detection-architecture-freeze`.

### Out of scope

Реализация TDOA; изменение WHITE_PAPER.

---

## Заметки

Порядок: **5 из 5**. Можно параллельно с harmonic после задачи 1.
