# Промпт (Night Build эпик): Linear-гигиена → живые провайдеры снов

> **Night Build** по [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md).  
> Размер: **M** (3 фазы NB0–NB2, одна ночь).  
> Реестр: `id` = `linear-hygiene-dreams-providers-night`.  
> Порядок владельца 20.07: **сначала 2 (доска↔мастерская), потом 1 (провайдеры снов)**.

---

## Контекст

День 20.07: первый боевой день движка задач с Linear + влит каркас снов (#740).  
Два хвоста, замороженные в эту ночь:

1. **Гигиена связки доска ↔ мастерская** — раздвоение карточек при старте, `linearId` не всегда в реестре, старт без единого канона.
2. **Живые провайдеры снов** — office `DreamsModule` есть; failover/`classifyOutcome` есть; не все четыре провайдера реально ходят через media-прокси.

Формат ночи ещё достраивается (G3 — норма; always-yes — принуждается). Соблюдаем то, что есть: worktree, ветка от `origin/main`, checkpoints, не мёржим, не prod, не archive.

**Ветка:** `night/linear-hygiene-dreams-providers-2026-07-20` ← `origin/main`.

---

## Подзадачи (строгий порядок)

| Фаза | Содержание | Lead | W | edit-class |
|------|------------|------|---|------------|
| **NB0** | Gate: baseline, neighbors, scoped CI scripts+office | Vesnin | S | code |
| **NB1** | Linear↔workshop hygiene: канон START + anti-duplicate + linearId | Ozhegov | M | code |
| **NB2** | Dreams providers: perplexity/grok/gemini via proxy + classifyOutcome | Dynin | M | code |

> **Stop rule:** 2 scoped CI fail подряд → WIP commit, `yarn night:close`, блокер в HANDOFF.

---

## Night Build — промпт целиком

### Кто ты

Исполнитель Night Build. Scope **заморожен** (NB0→NB1→NB2). Prod / merge main / `task:close-github` / правки `@membrana/core` / SSH — **СТОП**.

### Жёсткие инварианты

1. Не трогать API `scripts/lib/dreams-select.mjs` (только import).
2. Не мёржить в `main`, не archive registry, не prod-deploy.
3. Один писатель стора снов — office; CLI stub остаётся stub.
4. Human-in-loop (живой VDS smoke) — **не фабриковать**: артефакт + пометка в HANDOFF.
5. При раздвоении scope — стоп, не расширять.

### NB0 — Gate

1. `git status -sb`, ветка `night/linear-hygiene-dreams-providers-2026-07-20`, база = `origin/main`.
2. `yarn neighbors` (или эквивалент) — нет коллизии scope с соседними сессиями.
3. Scoped CI: `node --test scripts/dreams-*.test.mjs scripts/task-start.test.mjs` + `yarn workspace @membrana/background-office typecheck`.
4. Checkpoint pass.

**DoD:** зелёный baseline; зафиксирован commit `night(…): NB0 gate` если были правки-фиксы гейта.

### NB1 — Linear ↔ мастерская (сначала)

**Цель:** один канон старта/закрытия без дублей карточек.

In scope:
- `yarn task:start` / register: не создавать второй Linear при уже существующей связи; писать `linearId` в registry.
- Документ-канон коротко в промпте/AGENTS или TASKS (без романа): «доска = движение, Issue = удостоверение».
- Тест на anti-duplicate / linearId (unit, без сети) — обязан уметь упасть.
- Опционально: комментарий/линк GH↔Linear при старте, если уже есть хелпер.

Out of scope: переписывать весь task engine; UI Linear; вебхуки DRU-139 целиком.

**DoD:** тест зелёный; START-путь не плодит дубли при повторном старте с тем же issue; `linearId` появляется в карточке; checkpoint NB1.

### NB2 — Провайдеры снов (потом)

**Цель:** цепочка из 4 провайдеров реально ходит (или честно failover) через proxy.

In scope:
- Office `DreamsService.synthesize`: perplexity / deepseek / grok / gemini (или openrouter-маршруты), `HTTPS_PROXY`/`MEDIA` как у существующих сервисов.
- Исходы через `classifyOutcome` → `shouldFailover` (уже в `dreams-tick`).
- Unit-тесты с моками портов (без сети); dry-run path.
- Не трогать `dreams-select`.

Out of scope: VDS deploy; telegram доставка сверх уже влитого deliver; UI витрины.

**DoD:** при моке «первый balance → второй ok» статус synthesized; все 4 failed → synthesisFailed с attempts=4; typecheck office зелёный; checkpoint NB2.

### Stop rules

- 2 CI fail подряд → close + HANDOFF.
- Нет ключей для live — не врать void/checked; оставить мок-гейт и строку в HANDOFF «live — утро».
- Не открывать новые Issue mid-night кроме блокера.

### Финал

`yarn night:close --id linear-hygiene-dreams-providers-night`  
HANDOFF: сделано / не успели / блокеры / рекомендация утру (merge PR / день-2 / smoke VDS).

---

## Definition of Done (эпик)

- [ ] NB0–NB2 done или explicit defer в HANDOFF
- [ ] PR `night/linear-hygiene-dreams-providers-2026-07-20` открыт, **не** смёржен ночью
- [ ] Нет prod; нет правок core
- [ ] Утренний LGTM перед merge
