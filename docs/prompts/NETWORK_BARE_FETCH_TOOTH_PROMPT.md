# Промпт: Зуб check-bare-fetch — политика машин из machine-policy, warn-храповик (#1912)

> M · id `network-bare-fetch-tooth` · Issue [#1912](https://github.com/officefish/Membrana/issues/1912) · lead **ozhegov**, support **dynin**.
> Поставка 2 исполнения формы (канон — вердикт **В7** заседания
> [`network-container`](../meeting/network-container/MEETING_VERDICT.md), ратифицирован
> 13.08 с гармонизацией носителя). Нормы уже в стволе (поставка #1910).

## Контекст

Инвентарь 12.08: proxy-awareness — свойство файла, не политика машины; четыре голых
fetch в серверных пакетах названы бюджетом (`registry/network-policy-violations-budget.json`).
Политика машин — `registry/machine-policy.json` (единственный источник истины зуба).

## Что построить

1. **`scripts/check-bare-fetch.mjs`** (+чистое ядро в `scripts/lib/`): серверный файл
   (fallback-glob: `packages/background-*/src`, `packages/services/*/src` — конвенции
   `packageKind` в репо НЕТ, эрратум M7) + `fetch(`-семейство без proxy-обёртки + не
   покрыт `allowedBarePackages` → находка. Словарь находок закрыт: `VIOLATION` (красный)
   · `LEGACY` (в бюджете) · `AMNESTY` (с `expiresAt`) · `POLICY_INVALID` (красный).
   Автопочинки нет (#1425).
2. **Warn-храповик**: находки LEGACY считаются против `maxBareCallsCount`; сверх
   бюджета — VIOLATION. Снижение бюджета — PR с доказательством; увеличение — только
   amnesty-записью.
3. **Провод**: pre-push (`.githooks/pre-push`, по образцу соседних зубов) + шаг CI.
   Stdout — немедленный сигнал; находка дублируется в канал М4 (night-report) — форма
   дубля согласуется при исполнении поставки #1913 (T_night).

## Запрещено

- Чинить голые вызовы (#1425) — зуб называет, не чинит.
- Исключения комментарием в коде — только записью в machine-policy.
- Второй источник политики.

## Тесты (минимум)

| Область | Минимум |
|---|---|
| Детект | голый fetch в серверном файле → находка; proxy-обёртка → нет |
| Исключения | permanent/amnesty покрывают; истёкший expiresAt → VIOLATION |
| Храповик | 4 известных = LEGACY зелёно; 5-й → VIOLATION красный |
| Политика | битый machine-policy.json → POLICY_INVALID, красный |

## DoD

- [ ] Зуб зелёный на текущем стволе (4 LEGACY в бюджете, 0 VIOLATION).
- [ ] Подсаженный пятый голый вызов роняет прогон с именем файла.
- [ ] Провод в pre-push и CI; карта exit-кодов если зуб входит в цепочку.
- [ ] LGTM Teamlead.
