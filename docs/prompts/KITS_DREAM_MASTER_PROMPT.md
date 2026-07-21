# Промпт: Эпик: второй кит — dream-master (Мастер снов)

> **L** · `kits-dream-master` · [#855](https://github.com/officefish/Membrana/issues/855) · lead **vesnin**  
> Цепь: D0→D4 (#856–#860). Семя: [#761](https://github.com/officefish/Membrana/issues/761).  
> Прецедент: `kits-angelina-morning` (#814). Паттерн: [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md).  
> Автор снов: [`DREAM_MASTER_PROMPT.md`](./DREAM_MASTER_PROMPT.md) («Мастер снов», не VT-персона).  
> Статус: **D2** · жилец [`kits/dream-master/`](../../kits/dream-master/) · OPEN [`kits-dream-master-2026-07-21`](../day-sprint/kits-dream-master-2026-07-21/OPEN.md).

---

## Контекст

После `angelina-morning` слой китов умеет пинить утренний набор секретаря.
Второй жилец — контур **снов v2**: тик заезда, дайджест, lib select/format/providers/log,
промпт Мастера снов. Цель: autonomous-прогон (office cron / night) опирается на
**пин**, а не на «что вчера уехало в `scripts/lib/dreams-*`».

Прецедент: M5 ritual-refactor (`docs/seanses/ritual-refactor-m5-dreams-2026-07-20.md`);
инфра — `ritual-d-dreams` / `ritual-d-dreams-infra`.

## Границы (D0 — зафиксировано)

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом кода** | плоский [`scripts/`](../../scripts/README.md) (+ office-модуль снов — *ссылкой*, не копией) | класть код снов в `kits/` |
| **Дом кита** | [`kits/dream-master/`](../../kits/) (D2) | `docs/audit/git/` pins (BME) |
| **Схема** | уже [`kits/MANIFEST.schema.json`](../../kits/MANIFEST.schema.json) | второй schema-остров |
| **Аудит** | уже `yarn kits:audit` | писать новый зуб «для снов» |
| **Owner пина** | **dynin** (реализация контура) + авторство текста снов = «Мастер снов» / `DREAM_MASTER_VERSION` | leadPersona ≠ Ангелина |
| **Режимы** | interactive → latest; cron/office → **pinned** | |

**Запрещено в эпике:**

- Смешивать с **Night Build** (`night:open`…`close`) — другой жанр (код-спринт).
- Глотать **`night:research`** в тот же кит без отдельного решения владельца — соседняя
  семантика («сон системы» / Perplexity по графу правды, #598), не dreams v2.
- Подменять недоделанную инфру провайдеров (`ritual-d-dreams-infra`) «зелёным пином»
  полусырого tick — гейт готовности до D2.
- Копировать Nest/office исходники в `kits/` или `scripts/` дублями.

**Соседство:**

| Сосед | Правило |
|------|---------|
| `kits-angelina-morning` (#814) | прецедент; потребляем дом/схему/аудит, не дублируем |
| `ritual-d-dreams` / infra | ядро и cron; кит пинит готовое |
| `night-research-perplexity` (#598) | сосед; в кит — только по явному ok |
| Night Build / vesnin | оркестрация ночного кода; не roots кита снов |
| #761 | второй жилец паттерна; комментарий в closure |

## Фазы

| Фаза | id | Issue | lead | Суть |
|------|-----|------:|------|------|
| D0 | `kdm-d0-brief` | #856 | vesnin | бриф → LGTM; гейт готовности infra |
| D1 | `kdm-d1-roots` | #857 | ozhegov | финальный список roots + что *не* в ките |
| D2 | `kdm-d2-kit` | #858 | dynin | жилец `kits/dream-master/` + пины; audit зелёный |
| D3 | `kdm-d3-procedure` | #859 | ozhegov | `ritual-dreams` · `kitVersion` → кит |
| D4 | `kdm-d4-closure` | #860 | vesnin | CLOSURE + archive + #761 |

Дом `kits/` и K2-аудит **не** повторяем — уже в main.

## Состав кита dream-master (D1 — утверждено)

### Roots (точки входа)

| Root | yarn | Замечание |
|------|------|-----------|
| `scripts/dreams.mjs` | `dreams:tick`, `dreams:digest` | единственный root; подкоманды CLI |

`scripts/lib/dreams-{select,tick,format,providers,log}.mjs` — **не** отдельные roots:
входят в `pins` замыканием статических импортов (`yarn kits:audit`).

Замер замыкания на 2026-07-21 (~11 узлов): среди транзитивов есть
`scripts/lib/night-research.mjs` (`enumeratePairs`), `llm-probe.mjs`,
`_anthropic-env.mjs`, … — это **зависимости CLI снов**, не продукт
`yarn night:research`.

### Вне кита (out-of-kit)

| Что | Куда вместо |
|-----|-------------|
| Night Build (`night:open`…`close`, land-reports, always-yes) | свой контур / не pins |
| CLI `scripts/night-research.mjs` (`yarn night:research*`) | будущий `kits/night-research/` или отдельный ok |
| Nest `packages/background-office/.../dreams/*` | runtime office; README процедуры (D3), не pins |
| `docs/prompts/DREAM_MASTER_PROMPT.md` | **precedents[]** процедуры `ritual-dreams` (D3), не pins — нет static import `.md`; версия = `DREAM_MASTER_VERSION` в тексте промпта |
| `docs/truth/registry.json` (данные пар) | data-чтение runtime; слепая зона audit (как layer-direction) |

## Гейт готовности (до D2)

- [ ] `yarn dreams:tick` / digest — осмысленный прогон (не вечный pending).
- [ ] Провайдеры: ясный статус (mock vs live) в infra-карточке.
- [ ] Согласован owner: `leadPersona: dynin` в MANIFEST кита.

## Out of scope

- Night Build phases / always-yes
- Ценностный доклад утра (#788)
- GitHub Releases раздачи
- Новый schema-файл

## Acceptance criteria

- [x] Бриф D0 + границы (LGTM vesnin owner ok 2026-07-21)
- [x] `kits/dream-master/` с пинами; `yarn kits:audit --id dream-master` зелёный (LGTM dynin)
- [ ] Процедура `ritual-dreams` с `kitVersion`
- [ ] CLOSURE; #761 — второй жилец назван
- [x] `night:research` и Night Build явно вне кита (границы D0)
