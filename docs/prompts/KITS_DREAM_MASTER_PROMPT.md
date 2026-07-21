# Промпт: Эпик: второй кит — dream-master (Мастер снов)

> **L** · `kits-dream-master` · Issue — *завести при старте* · lead **vesnin**  
> Семя паттерна: [#761](https://github.com/officefish/Membrana/issues/761) · прецедент жильца: `kits-angelina-morning` (#814).  
> Паттерн: [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md).  
> Автор снов: [`DREAM_MASTER_PROMPT.md`](./DREAM_MASTER_PROMPT.md) («Мастер снов», не VT-персона).  
> Статус: **бриф (черновик)** — дом `kits/` и зуб аудита уже есть; эпик = второй жилец + процедура.

---

## Контекст

После `angelina-morning` слой китов умеет пинить утренний набор секретаря.
Второй жилец — контур **снов v2**: тик заезда, дайджест, lib select/format/providers/log,
промпт Мастера снов. Цель: autonomous-прогон (office cron / night) опирается на
**пин**, а не на «что вчера уехало в `scripts/lib/dreams-*`».

Прецедент: M5 ritual-refactor (`docs/seanses/ritual-refactor-m5-dreams-2026-07-20.md`);
инфра — `ritual-d-dreams` / `ritual-d-dreams-infra`.

## Границы (зафиксировать в K0)

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом кода** | плоский [`scripts/`](../../scripts/README.md) (+ office-модуль снов — *ссылкой*, не копией) | класть код снов в `kits/` |
| **Дом кита** | [`kits/dream-master/`](../../kits/) (K3) | `docs/audit/git/` pins (BME) |
| **Схема** | уже [`kits/MANIFEST.schema.json`](../../kits/MANIFEST.schema.json) | второй schema-остров |
| **Аудит** | уже `yarn kits:audit` | писать новый зуб «для снов» |
| **Owner пина** | **dynin** (реализация контура) + авторство текста снов = «Мастер снов» / `DREAM_MASTER_VERSION` | leadPersona ≠ Ангелина |
| **Режимы** | interactive → latest; cron/office → **pinned** | |

**Запрещено в эпике:**

- Смешивать с **Night Build** (`night:open`…`close`) — другой жанр (код-спринт).
- Глотать **`night:research`** в тот же кит без отдельного решения владельца — соседняя
  семантика («сон системы» / Perplexity по графу правды, #598), не dreams v2.
- Подменять недоделанную инфру провайдеров (`ritual-d-dreams-infra`) «зелёным пином»
  полусырого tick — гейт готовности до K3.
- Копировать Nest/office исходники в `kits/` или `scripts/` дублями.

**Соседство:**

| Сосед | Правило |
|------|---------|
| `kits-angelina-morning` (#814) | прецедент; потребляем дом/схему/аудит, не дублируем |
| `ritual-d-dreams` / infra | ядро и cron; кит пинит готовое |
| `night-research-perplexity` (#598) | сосед; в кит — только по явному ok |
| Night Build / vesnin | оркестрация ночного кода; не roots кита снов |
| #761 | второй жилец паттерна; комментарий в closure |

## Фазы (черновик цепи)

| Фаза | id (черновик) | lead | Суть |
|------|---------------|------|------|
| D0 | `kdm-d0-brief` | vesnin | этот бриф → LGTM; гейт готовности infra |
| D1 | `kdm-d1-roots` | ozhegov | финальный список roots + что *не* в ките (office vs scripts) |
| D2 | `kdm-d2-kit` | dynin | жилец `kits/dream-master/` + пины; `kits:audit` зелёный |
| D3 | `kdm-d3-procedure` | ozhegov | `docs/procedures/ritual-dreams/` · `kitVersion` → кит; engines не дублируют subgraph |
| D4 | `kdm-d4-closure` | vesnin | CLOSURE + archive + комментарий #761 (второй жилец) |

Дом `kits/` и K2-аудит **не** повторяем — уже в main.

## Состав кита dream-master (черновик корней)

Минимум (scripts-плоскость):

| Корень | yarn / файл |
|--------|-------------|
| CLI снов | `scripts/dreams.mjs` (`dreams:tick`, `dreams:digest`) |
| select | `scripts/lib/dreams-select.mjs` |
| tick | `scripts/lib/dreams-tick.mjs` |
| format | `scripts/lib/dreams-format.mjs` |
| providers | `scripts/lib/dreams-providers.mjs` |
| log / author | `scripts/lib/dreams-log.mjs` |
| промпт автора | `docs/prompts/DREAM_MASTER_PROMPT.md` (*если* аудит научится пинить non-mjs — иначе держать в precedents процедуры, не в pins) |

Транзитивные импорты `scripts/lib/*` — в `pins` автоматически (как у angelina-morning).

**Опционально / gated (D1):**

- `night:research` (+ lib) — только если владелец скажет «один ночной исследовательский кит»;
  иначе отдельный будущий `kits/night-research/`.
- Ссылки на `packages/background-office/.../dreams/*` — в README процедуры как runtime,
  не в pins кита (слой scripts ≠ Nest), пока нет политики пина cross-package.

## Гейт готовности (до D2)

- [ ] `yarn dreams:tick` / digest — осмысленный прогон (не вечный pending).
- [ ] Провайдеры: ясный статус (mock vs live) в infra-карточке.
- [ ] Согласован owner: `leadPersona: dynin` в MANIFEST кита.

## Out of scope

- Night Build phases / always-yes
- Ценностный доклад утра (#788)
- GitHub Releases раздачи
- Новый schema-файл

## Acceptance (эпик)

- [ ] Бриф D0 + LGTM vesnin
- [ ] `kits/dream-master/` с пинами; `yarn kits:audit --id dream-master` зелёный
- [ ] Процедура `ritual-dreams` с `kitVersion`
- [ ] CLOSURE; #761 — второй жилец назван
- [ ] `night:research` и Night Build явно вне кита (или вынесены отдельным решением)
