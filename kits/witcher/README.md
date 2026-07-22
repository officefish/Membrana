# witcher — кит ловушек бестиария («Ведьмак»)

Четвёртый жилец слоя [`kits/`](../README.md). Именованный пин **одной** поставки-ловушки
мастерской бестиария: CLI осмотра + линза с `detectSilent` (ловушка
`silent-empty-catch`). Human-label aim-примера — **«Ведьмак»** (T5); id каталога =
`witcher`.

**Owner пина:** `dynin` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).  
**Дом мастерской:** [`docs/audit/bestiary/`](../../docs/audit/bestiary/) ·
[`workshop.manifest.json`](../../docs/audit/bestiary/workshop.manifest.json) → `kit: "witcher"`.  
**Эпик:** `bestiary-workshop` (#945) · фаза W4 (#950).

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактив, охотник рядом | дерево может быть новее; `yarn kits:audit --id witcher --mode latest` |
| **pinned** | воспроизводимая выдача ловушки | только от пина; `yarn kits:audit --id witcher` |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`.

## Root

| Root | yarn | Роль |
|------|------|------|
| `scripts/bestiary-audit.mjs` | `bestiary:audit` | CLI покрытия specimen’ами; тянет линзу |

Замыкание (~4 узла): `lib/bestiary-audit` → `lib/lens-bestiary` (`detectSilent` /
`BESTIARY` / `aimBestiary`) → `lib/truth-graph` (транзитив линзы).

**Не в pins (T18):** шаблоны антипаттернов `docs/audit/bestiary/antipatterns/*.md`,
карточки `traps/`, улов `CATCH_LIST` — живут в доме audit; кит пинит **ловушку**
(prompts+scripts), не абстрактный шаблон.

## Precedents / промпты ловушки (не static-import)

| Path | Роль |
|------|------|
| [`docs/audit/bestiary/AGENT_PROMPT.md`](../../docs/audit/bestiary/AGENT_PROMPT.md) · Scenario Issue-Trap | заказ поставки (`issueTrap`) |
| [`docs/audit/bestiary/AGENT_PROMPT.md`](../../docs/audit/bestiary/AGENT_PROMPT.md) · Scenario Trap-Doc | карточка ловушки |
| [`docs/audit/bestiary/traps/silent-empty-catch.md`](../../docs/audit/bestiary/traps/silent-empty-catch.md) | карточка `silent-empty-catch` |
| [`docs/prompts/BW_W4_TRAP_KIT_PROMPT.md`](../../docs/prompts/BW_W4_TRAP_KIT_PROMPT.md) | DoD фазы |

Как у `dream-master` / `DREAM_MASTER_PROMPT`: markdown **не** в `pins` (нет static
import `.md`).

## Aim-пример («Ведьмак») — cookbook T5

Охотник (спринт / док / скрипт) заказывает ловушку → мастерская выдаёт пин:

1. Назвать цель: класс `silent` / симптом «пустой catch» / путь в спринте.
2. Открыть карточку [`traps/silent-empty-catch.md`](../../docs/audit/bestiary/traps/silent-empty-catch.md)
   и индекс [`TRAPS_LIST.md`](../../docs/audit/bestiary/registry/TRAPS_LIST.md) (`kitPin` → этот кит).
3. Вызов поставки: Scenario **Issue-Trap** → глагол **`issueTrap`** → жилец
   `kits/witcher` (не шаблон `antipatterns/silent.md`).
4. Сверка пина: `yarn kits:audit --id witcher` (blocking = 0).
5. Осмотр дома: `yarn bestiary:audit` (корень кита) — покрытие specimen’ами; линза
   находит, не чинит (#533).
6. Наведение на чужой спринт/док/скрипт: смотреть evidence в `CATCH_LIST` и пути
   engines из pins; новый класс ловушки — отдельная карточка (вне этого кита).

## Аудит

```bash
yarn kits:audit --id witcher
yarn kits:audit --id witcher --mode latest
```

## Чеклист PINNED_SUBGRAPH (этот кит)

1. ✅ Единица версии — подграф в `MANIFEST.json` (`pins`).
2. ✅ Пины — git blob SHA; копий нет.
3. ✅ Аудит — `yarn kits:audit --id witcher`.
4. ✅ Режимы latest/pinned — таблица выше.
5. ✅ Обновление пина — отдельный коммит манифеста.
6. ✅ Владелец пина — `leadPersona: dynin`.
7. ✅ Дрейф — табличный вывод audit.
8. ✅ Антипаттерн-MD вне pins (T18).

## Вне кита

| Что | Куда |
|-----|------|
| Шаблоны антипаттернов | `docs/audit/bestiary/antipatterns/` |
| Полный парк ловушек на все классы | follow-up после W4 |
| Mintlify-зеркало | `apps/docs/bestiary/` (W3) — монитор, не пин |
| Автофикс (#533) | запрещён |
| CLOSURE эпика | W5 |
