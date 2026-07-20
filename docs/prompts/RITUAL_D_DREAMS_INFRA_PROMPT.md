# Промпт: сны v2 — стор + office cron + доставка (обстройка ядра D)

> **Task-промпт.** Размер: **L**. Реестр: `ritual-d-dreams-infra`.
> Linear: [DRU-246](https://linear.app/techies68/issue/DRU-246).
> Дизайн: M5 [`ritual-refactor-m5-dreams-2026-07-20.md`](../seanses/ritual-refactor-m5-dreams-2026-07-20.md).
> Ядро уже в main: `scripts/lib/dreams-select.mjs` (DRU-245 / PR #730) — **не переписывать**.

---

## Контекст

Ядро select/failover готово. Этот проход обстраивает рантайм: append-only стор,
«Мастер снов», office cron 24/сутки, доставка 6 победителей, провайдеры через
media-прокси с `classifyOutcome` для failover.

**#598 / DRU-199:** CLOSED как S6 Perplexity wire. Продуктово `night:research` как
канал стратегии superseded M5 — номер **не** переиспользуем; новый контейнер = этот спринт.

---

## Промпт целиком

### Что построить

1. **Append-only event-log** (единственный писатель): 24 сна/сутки лежат все;
   6 победителей — derived (`digest`/`select` из ядра), не мутация.
2. **Автор** `Мастер снов`, `version` = промпт (хэш/метка файла промпта).
3. **Тик синтеза** с `rollProvider` + `classifyOutcome` (balance/auth/rate-limit →
   следующий провайдер; терминал `synthesisFailed` с полным провенансом attempts).
4. **Office cron** 24 тика/сутки; пропуск = `skipped` без ретроактивного залпа.
5. **Доставка:** HTTP read-проекция дайджеста + путь в ритуал/telegram (линза M4 снаружи).

### Архитектура

| Слой | Путь |
|------|------|
| Ядро (данное) | `scripts/lib/dreams-select.mjs` |
| Лог + reducer | `scripts/lib/dreams-log.mjs` |
| Тик / failover | `scripts/lib/dreams-tick.mjs` |
| Промпт автора | `docs/prompts/DREAM_MASTER_PROMPT.md` (+ VERSION) |
| Office | `packages/background-office/src/modules/dreams/` |
| Тесты | `scripts/dreams-log.test.mjs`, `scripts/dreams-tick.test.mjs` |

**Запрещено:** трогать API `dreams-select`; писать в граф правды; второй писатель стора;
добивать digest до 6 из проигравших; ставить `adopted` из контура night:research.

### Definition of Done

- [ ] Append-only лог: append + readDay + projectDigest; дедуп по `(day, hour)`.
- [ ] Тик: пара → failover → synthesized | synthesisFailed | skipped; attempts в провенансе.
- [ ] Office: cron `@Cron('0 * * * *')`, GET digest; volume path из env.
- [ ] Тесты без сети на лог/тик/failover (моки портов + classifyOutcome).
- [ ] M5/EPIC seanses в ветке; PR; Linear DRU-246 → Done после merge.

---

## Заметки

- Первый PR может нести лог+тик+office skeleton; UI-витрина 6 карточек — follow-up при необходимости.
- `ritual-d-dreams` (ядро) — archive после подтверждения, что infra-карточка ведёт.
