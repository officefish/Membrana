# ADR — управление переключением лупов main↔alarm: тумблер, захват, узлы

> **Статус:** DRAFT · 2026-07-11 — **merge этого файла ≠ принятие решений**; решения Р1–Р3 действуют только после явного LGTM владельца.
> **Контекст:** продолжение консилиума [`detection-alarm-loop-switch-2026-07-11.md`](../../seanses/detection-alarm-loop-switch-2026-07-11.md)
> (тема 1 — источник входа в alarm = fusion `combinedScore` через `front` + `loop-transition-policy`).
> Этот ADR закрывает 3 темы, которые автоконсилиум дважды не покрыл: тумблер, захват, явные узлы.
> Основание вне гейта: гейтинг захватом — исполнение по готовому канону (§3.2/§3.3); toggle-sync —
> рантайм-рефактор без нового core-контракта; узлы — решение «не добавлять контракт» гейта не требует.

## Наблюдаемое состояние (подтверждено кодом)

> Строчные ссылки — снимок на **2026-07-11**; при дрейфе файлов сверять по имени символа, не по номеру строки.

| Факт | Где |
|------|-----|
| `mode: RuntimeMode = 'normal' \| 'alarm'` — **ручной intent**, одно поле | `scenario-runtime.ts:146,199` |
| Ручной override `mode==='alarm'` форсит alarm-loop, игнорит авто | `scenario-runtime.ts:763` |
| Авто detection-front входит в alarm-loop **не меняя `mode`** | `scenario-runtime.ts:820` (`runAlarmLoop(..., 'detection front')`) |
| Тумблер шапки привязан к `mode`, `disabled` только по `!isRunning` | `device-board-shell.tsx:1628-1640` |
| Матрица play/stop под захватом (`canStart=!hard`, emergency stop всегда) | `capture-playback-matrix.ts` |

**Корневой гэп:** нет поля «фактический активный луп». Тумблер показывает *intent*, а при авто-alarm он остаётся `normal`, хотя alarm-loop реально крутится. И тумблер `mode` **не** гейтится захватом (под hard кликабелен).

## Решения

### Р1 — разделить intent и effective (двусторонний sync тумблера)
- Ввести в `ScenarioRuntimeState` поле **`effectiveLoop: 'main' \| 'alarm'`** — фактический активный луп. Пишут **оба** источника: ручной override (`mode==='alarm'`) и авто-путь (`loop-transition-policy.inAlarm` / detection-front).
- **`mode` остаётся ручным intent** (`'normal' \| 'alarm'`), но семантика: `'alarm'` = форс-override; `'normal'` = «отдать авто-политике».
- **Тумблер шапки отображает `effectiveLoop`** (истина «что активно»), клик оператора пишет `mode` (intent). `aria-pressed`/цвет — от `effectiveLoop`.
- Приоритет/release: ручной `'alarm'` > авто; снятие override (`'normal'`) → немедленный возврат в main, авто-политика снова управляет (поведение `:915,921` сохраняется, добавляется лишь отражение в `effectiveLoop`).
- **Границы:** `effectiveLoop` — в `device-board` runtime state (не в `@membrana/core`); новый core-контракт не заводим.

### Р2 — гейтинг переключения захватом
- Расширить матрицу захвата полем **`canSwitchMode: boolean`** (по правилу `canStart`: `!hard`). none/soft → `true`, hard → `false`.
- **Enforcement в двух слоях (defense-in-depth):** shell — тумблер `disabled = !isRunning || !canSwitchMode`; runtime — `setMode` игнорит вызов при hard-захвате (лог `setMode ignored: hard-capture`), чтобы realtime-команда не обошла UI.
- **Инварианты канона:** emergency **stop доступен всегда** (§3.3) — не трогаем; hard = строго view-only по управлению, но оператор **видит** `effectiveLoop` и переключает левые вкладки-наблюдение; soft = last-write-win (§3.2) между устройством и наблюдателем.
- **Границы:** переиспользуем существующие `captureMode`/`viewNavigationOnly`/`isScenarioViewOnly`; новых флагов не плодим.

### Р3 — НЕ вводить явные palette-узлы перехода (пока)
- Переключение main↔alarm остаётся **рантайм-контрактом** (`loop-transition-policy` + тумблер), **без** новых node kinds.
- **Обоснование:** (а) новые node kinds = изменение core-контракта (тяжёлый гейт); (б) переход — сквозная рантайм-лемма (detection-front/proximity/policy), а не пер-сценарная авторская настройка; узлы протащили бы рантайм-семантику в каждый граф и вернули риск L35-класса (гонки latent-веток); (в) для S3-самодокументируемости достаточно **read-only индикатора** активного лупа на полотне (`effectiveLoop` + причина: manual/detection-front), а не редактируемых узлов.
- **Пересмотр:** вернуться к узлам только если конкретный сценарий S3-редактирования докажет недостаточность рантайм-контракта. Тогда — отдельный консилиум-гейт палитры.

## Definition of Done (для будущей реализации, не этот PR)
- `effectiveLoop` в runtime state; пишется ручным override и авто-политикой; юнит-тест: авто-alarm при `mode==='normal'` → `effectiveLoop==='alarm'`.
- Тумблер шапки отражает `effectiveLoop`; клик пишет `mode`; a11y `aria-pressed`/`aria-live` от effective.
- `canSwitchMode` в матрице захвата; тумблер `disabled` под hard; `setMode` игнорит при hard (+лог); emergency stop не задет; тест матрицы none/soft/hard.
- Read-only индикатор активного лупа на полотне (effective + причина) — вместо явных узлов.
- 703 базовых теста device-board зелёные; сценарии в пикере не изменены (правки только в платформе).

## Открытые задачи вне этого ADR
- **Alpha entry-id (L36):** переименовать 6 точек входа `alpha-*` → канон `SCENARIO_*_ENTRY` (механически) ИЛИ пересобрать Alpha деривацией MVP; отдельная usercase-generation задача.
- **pure-геттеры GetMicrophone/GetAudioStream:** добавить pure-вариант (паттерн `getRecorderNodePins(pure)`) — лёгкий ADR/PR, не полный консилиум.
