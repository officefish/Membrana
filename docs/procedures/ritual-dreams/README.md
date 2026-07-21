# Процедура: ritual-dreams — контур снов v2

**Определение.** Процедура автономного/полуавтономного прогона снов: тик заезда
(`dreams:tick`), дайджест (`dreams:digest`), синтез текста субагентом «Мастер снов».
Оперирует категориями слоя: стратегической целью (пары графа правды),
ответственностью (провенанс автора/версии промпта) и командой (потребители
дайджеста утром).

**Держатель:** dynin (`leadPersona` манифеста; owner пина кита). Текст снов пишет
версионный субагент «Мастер снов» ([`DREAM_MASTER_PROMPT.md`](../../prompts/DREAM_MASTER_PROMPT.md)),
не персона виртуальной команды.

## Кит (D3 / #859)

Набор пинится китом [`kits/dream-master/`](../../../kits/dream-master/) через
**`kitVersion`**: `kits/dream-master`. Subgraph — в манифесте кита, **не** в
`engines[]`.

| Режим | Правило |
|-------|---------|
| **latest** | интерактив; `yarn kits:audit --id dream-master --mode latest` |
| **pinned** | cron / office; только от пина кита |

## Движки

В контейнере кода нет (Т12). `engines[]` — якорь CLI: `scripts/dreams.mjs`
(`yarn dreams:tick` / `dreams:digest`). Остальное — замыкание кита.

Nest-модуль office (`packages/background-office/.../dreams`) — runtime доставки;
в pins кита нет (D1), описывается здесь как соседний исполнитель.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `id`, `leadPersona`, `kitVersion`,
`engines[]`, `precedents[]`. Среди precedents — промпт Мастера снов (версия
`DREAM_MASTER_VERSION`, не SHA-пин) и протокол M5.

Зуб: `validateProcedure` (резолв `kitVersion` → дом кита).

## Определение ↔ прогон

Этот каталог — **определение**. Инстансы (логи тиков, дайджесты) живут в volume
снов / артефактах дня и сюда не мигрируют.
