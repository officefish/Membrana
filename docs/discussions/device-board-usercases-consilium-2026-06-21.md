# Консилиум: Device-Board UserCases (каталог сценариев)

> **Дата:** 2026-06-21  
> **Инициатор:** Product (пользователь)  
> **Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko)  
> **Статус:** **протокол зафиксирован** · epic prompt + Issue **созданы** (см. [`DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASES_EPIC_PROMPT.md))  
> **Родитель roadmap:** [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md) (U1 → поглощается U9)  
> **Предшественники:** UserCase MVP LGTM · U8 canvas groups/functions · U8a node align advanced

---

## Повестка

**UserCases** — единый комплексный JSON-документ, описывающий состояние **всех шести сценариев** (веток обработчиков) и включающий **пользовательские функции** (и визуальные comment groups).

**Цель продукта:** загрузка UserCase позволяет пройти задуманный сценарий end-to-end; цепочка на canvas выглядит **аккуратно, логично, приятно** — у оператора ощущение лёгкости восприятия и последовательности.

**Дистрибуция (v1 → future):**

- v1: UserCases поставляются **тарифом** (entitlement через cabinet / settings).
- bundled MVP (`usercase-mvp-microphone`) — бесплатный эталон.
- future: community + marketplace (сильно позже); schema должна это допускать.

**UX-доступ:** включение/entitlement в **настройках** → выбор и применение через **модальное окно** на device-board (не «случайный dropdown в шапке»).

**Hard dependencies:** полная поддержка выравниваний, объединений в группы, упаковки нод в пользовательские функции (U8 + U8a).

---

## Контекст репозитория (на момент консилиума)

| Артефакт | Состояние |
|----------|-----------|
| Runtime UserCase MVP microphone | LGTM 2026-06-21, bundled `DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT` |
| Manifest | `docs/device-board-scripts/usercase-mvp-microphone/manifest.json` |
| Build | `yarn usercase:build-mvp-microphone` → `default-usercase-mvp-microphone.generated.ts` |
| U8 groups / functions / align MVP | PR #134 (canvas groups) |
| U8a exec dagre + snap guides | PR #135 (node align advanced) |
| Draft контракт | § Future в [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md) |
| Roadmap U1 | «UserCase picker / Загрузить MVP» — **переопределяется** этим консилиумом |

---

## Обсуждение (протокол)

**Порядок реплик:** Vesnin → Ozhegov → Dynin → Музыкант → Rodchenko → (цикл)

---

[Teamlead — Vesnin]:  
UserCases — продуктовый слой поверх `DeviceScenarioDocument`, не отдельный формат. MVP microphone уже доказал runtime на live mic; следующий шаг — **каталог + gating + apply-flow + layout canon**. Эпик предлагаю назвать **U9** (`db-usercases-catalog-u9`), родитель — `db-post-usercase-roadmap`. Issue и task-промпт оформим **после** этого протокола — product явно попросил сначала зафиксировать обсуждение.

[Структурщик — Ozhegov]:  
Согласен: один документ v2 = `signalGraph` + `scenario` (6 веток) + `variables` + `functions[]` + `commentGroups[]`. Manifest — metadata и entitlement, не дублирует graph. Парсинг уже в `@membrana/core`; tariff-логику в core **не** тащим.

[Математик — Dynin]:  
«Аккуратность» должна быть **измеримой**: monotonic x на exec-spine, grid 8 px, overlap penalty после dagre. Иначе каждый автор UserCase будет субъективно «красить» граф руками.

[Музыкант]:  
Для microphone UserCase — эталон prod-патча: recording gate, policy constructors, pure getters, journal refs. Загрузка должна сразу давать Run без ручной сборки цепочки.

[Верстальщик — Rodchenko]:  
Два шага UX: **Settings** (включить каталог, видеть entitlement) → **modal на board** (выбор карточки, preview, confirm). Header dropdown из старого draft U1 отклоняем — слишком легко перезаписать сценарий случайно.

[Teamlead — Vesnin]:  
Принимаю двухшаговый UX. Apply v1 — **apply-all** document с confirm + ref-mapping. Apply одной ветки — v1.1, не блокирует эпик.

[Структурщик — Ozhegov]:  
Apply-all вызывает `hydrateBoardFromDocument`; signal layer не трогаем. При смене deviceId/journal refs — modal mapping как при branch import. Dirty state: если есть несохранённые правки — второй confirm.

[Математик — Dynin]:  
Предлагаю CI-скрипт `yarn usercase:verify-layout <id>`: чистые проверки поверх `layout-exec-chain` и `snapBoardLayoutCoordinate`. Human editorial LGTM + automated green = merge bundled UserCase.

[Музыкант]:  
`deviceKind` mismatch — hard block в picker с понятным copy. Drone / playback UserCases — отдельные manifest, общий catalog index.

[Верстальщик — Rodchenko]:  
Карточка в modal: title, deviceKind badge, «6 веток · N функций», краткое описание. Locked по тарифу — disabled + «Доступно в тарифе …». Bundled MVP всегда доступен.

[Teamlead — Vesnin]:  
Tariff v1 — stub через settings/cabinet hook; bundled не требует сети. Server-side catalog (`background-media`) — фаза после C1, не блокирует MVP picker.

[Структурщик — Ozhegov]:  
Слои: (1) core parse/validate — есть; (2) `device-board` hydrate + `applyUserCase`; (3) `apps/client` `UserCaseCatalogService`; (4) cabinet tariff SKU lookup. Community id в manifest — поле `tier: 'community'` без UI v1.

[Математик — Dynin]:  
Function subgraphs в UserCase: depth ≤ 1, pins ≤ 9/side (D-PINS-9). Verify-layout добавляет проверку pin count и отсутствие nested subgraph blocks.

[Музыкант]:  
Main loop — spine recording gate + trends FFT; alarm может оставаться stub, но layout всё равно LR. onStop/onDisconnect — короткие ветки, тоже проходят grid snap.

[Верстальщик — Rodchenko]:  
После apply — optional auto `exec-chain layout` если `layoutProfile: 'exec-lr-v1'`. Comment groups — semantic frames («Recording gate», «Trends FFT») по DESIGN.md: dashed border, title RU, отступы 8 px.

[Teamlead — Vesnin]:  
U8/U8a — hard dependency до старта U9 implementation. Можно писать prompt и schema параллельно, но код picker — после merge #134 и #135.

[Структурщик — Ozhegov]:  
Manifest draft:

```typescript
interface DeviceBoardUserCaseManifest {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly deviceKind: DeviceKind;
  readonly tier?: 'bundled' | 'tariff' | 'community';
  readonly tariffSku?: string;
  readonly layoutProfile: 'exec-lr-v1';
  readonly minEditorFeatures: readonly ('align' | 'groups' | 'functions' | 'exec-layout')[];
  readonly embeddedDocument: string;
  readonly preview?: { readonly branchStats?: Record<string, { nodeCount: number; edgeCount: number }> };
}
```

[Математик — Dynin]:  
`layoutProfile` — версионируем. v1 = dagre LR + 8 px grid + comment frames. Смена профиля — новый enum, не silent breaking change.

[Музыкант]:  
Звук и detector policy живут **внутри** document nodes, manifest только указывает `deviceKind` и marketing copy. Иначе рассинхрон runtime и каталога.

[Верстальщик — Rodchenko]:  
Settings-секция: «UserCases» / «Сценарии по подписке» — toggle «Показывать каталог на доске», список активированных (Bundled ✓ / Tariff ✓ / Locked). Модуль device-board или membrane settings — уточним в prompt; граница UI в `apps/client`.

[Teamlead — Vesnin]:  
Marketplace / upload / community moderation — **out of scope v1**. В manifest только `tier: 'community'` как задел. Undo после apply-all — отдельный эпик, не блокер.

[Структурщик — Ozhegov]:  
Источник bundled: `docs/device-board-scripts/usercase-<id>/`. Build script уже есть для MVP; обобщаем в `yarn usercase:build <id>` + `yarn usercase:verify <id>` (kinds + layout).

[Математик — Dynin]:  
Branch symmetry heuristic: sibling exec-ветви |Δy| ≤ порог — warning в verify, не hard fail на v1. Overlap same rank — hard fail.

[Музыкант]:  
Первый каталог-элемент остаётся `usercase-mvp-microphone`. Второй UserCase — только после editorial pass + verify green; не плодим полуготовые JSON.

[Верстальщик — Rodchenko]:  
Confirm apply-all: «Заменить текущий сценарий? Несохранённые изменения будут потеряны.» Primary destructive — `btn-error` или outline по DESIGN.md; secondary «Отмена».

[Teamlead — Vesnin]:  
Консенсус есть. Документируем решения в таблице ниже; epic prompt `DEVICE_BOARD_USERCASES_EPIC_PROMPT.md` и registry `db-usercases-catalog-u9` — **следующий шаг**, не в этом коммите обсуждения. CONCEPT §20 — в фазе D1 эпика.

[Структурщик — Ozhegov]:  
Принимаю. Ссылку на этот файл в prompt сделаем обязательной в шапке, как у Membrane Platform.

[Математик — Dynin]:  
Принимаю. Verify-layout — acceptance criteria эпика, не optional nice-to-have.

[Музыкант]:  
Принимаю.

[Верстальщик — Rodchenko]:  
Принимаю.

---

## Итоговое решение консилиума

| # | Вопрос | Решение v1 |
|---|--------|------------|
| 1 | **Единица поставки** | Один `DeviceScenarioDocument` v2 + `manifest.json` (6 веток + `functions[]` + `commentGroups[]`) |
| 2 | **ID эпика (draft)** | `db-usercases-catalog-u9`; roadmap label **U9** |
| 3 | **Apply** | **apply-all** с confirm + dirty check + ref-mapping; signal layer не меняется |
| 4 | **UX доступа** | **Settings** (entitlement / toggle) → **modal picker** на device-board |
| 5 | **Источники v1** | `bundled` (MVP free) + `tariff` (cabinet SKU); `community` — только schema |
| 6 | **Layout canon** | `layoutProfile: 'exec-lr-v1'`; post-apply auto exec-layout; CI `usercase:verify-layout` |
| 7 | **Hard deps** | U8 + U8a merged (#134, #135) |
| 8 | **Core boundary** | Tariff/entitlement **не** в `@membrana/core` |
| 9 | **Marketplace** | Out of scope v1 |
| 10 | **Следующие артефакты** | Протокол ✓ → [`DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASES_EPIC_PROMPT.md) · GitHub [#136](https://github.com/officefish/Membrana/issues/136) · registry `db-usercases-catalog-u9` |

### Product decisions (LGTM)

| ID | Тема | Решение |
|----|------|---------|
| **D-UC-DOC** | Документ | Full `DeviceScenarioDocument` v2, не loose branch JSON |
| **D-UC-APPLY** | Apply | apply-all v1; apply-branch → v1.1 |
| **D-UC-GATE** | Доступ | Settings → modal (не header dropdown) |
| **D-UC-TIER** | Entitlement | bundled + tariff stub; community schema only |
| **D-UC-LAYOUT** | Визуал | layoutProfile + verify-layout CI + comment group frames |
| **D-UC-DEPS** | Зависимости | U8 + U8a обязательны |

---

## Предлагаемые фазы эпика (draft для prompt)

| Фаза | id (draft) | Содержание |
|------|------------|------------|
| **R0** | `db-uc-r0-schema` | Manifest contract, build/verify scripts, node kind CI |
| **L1** | `db-uc-l1-layout-canon` | Editorial layout MVP + `usercase:verify-layout` |
| **C1** | `db-uc-c1-catalog` | Bundled catalog service + index `usercase-*/` |
| **G1** | `db-uc-g1-settings-gate` | Settings UI + entitlement hook |
| **P1** | `db-uc-p1-picker-modal` | Modal + apply-all + confirm + ref-mapping |
| **D1** | `db-uc-d1-docs` | CONCEPT §20, apps/docs page |

**Out of scope v1:** marketplace upload, apply-single-branch, server CRUD UserCases, undo stack.

---

## Definition of Done (эпик, draft)

- [ ] Manifest + full document для `usercase-mvp-microphone`; CI verify layout + node kinds
- [ ] Settings: секция UserCases; bundled MVP без tariff
- [ ] Modal: выбор → confirm → apply-all → hydrate; Run main loop без ручного import
- [ ] После apply граф LR-упорядочен (exec layout) с comment groups
- [ ] Tariff hook: locked UserCase disabled с copy «Доступно в тарифе …» (stub OK)
- [ ] CONCEPT §20 + epic prompt в реестре; `@membrana/device-board` tests green

---

## Связанные документы

| Документ | Роль |
|----------|------|
| [`USERCASE_MVP_MICROPHONE_LGTM.md`](../device-board-scripts/USERCASE_MVP_MICROPHONE_LGTM.md) | Runtime sign-off MVP |
| [`usercase-mvp-microphone/manifest.json`](../device-board-scripts/usercase-mvp-microphone/manifest.json) | Первый manifest |
| [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md) | Родитель U1→U9 |
| [`DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) | U8 dependency |
| [`DEVICE_BOARD_NODE_ALIGN_ADVANCED_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_NODE_ALIGN_ADVANCED_EPIC_PROMPT.md) | U8a dependency |
| [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md) | § Future UserCases (superseded UX) |

---

## Открытые вопросы (не блокируют протокол)

- Точное расположение Settings-секции: модуль device-board vs global membrane settings (решить в epic prompt).
- Server catalog API в `background-media` vs static bundled-only v1 (фаза C1+).
- Авто-layout после apply: always vs opt-in toggle в modal (склоняемся к always для `exec-lr-v1`).

---

*Протокол зафиксирован: product + виртуальная команда, 2026-06-21. Epic prompt: [`DEVICE_BOARD_USERCASES_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASES_EPIC_PROMPT.md) · Issue [#136](https://github.com/officefish/Membrana/issues/136).*
