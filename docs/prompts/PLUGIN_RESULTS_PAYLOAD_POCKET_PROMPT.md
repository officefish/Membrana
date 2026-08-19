# Промпт: карман payload в RunResult vs расширение в корне (passthrough в приёмнике моста)

> Карточка `plugin-results-payload-pocket` (S, lead vesnin, support ozhegov), Issue #1982 —
> follow-up ревью PR #1981 (блок b2 спринта `plugin-results-bridge`, эпик #1961).
> Решение владельца словаря (Архитектор, M1). Код — только после решения.

## Факт

Исполнитель расширяет `RunResult` своими полями (`MfccRunResult`: пробы и сводка в корне),
дом хранит документ целиком (`$set: {...run}`), живая запись 18.08 лежит в `plugin-results`
именно так. Приёмник моста (`runRecordSchema.passthrough()`,
`packages/background-office/src/modules/plugin-results/plugin-results.dto.ts`) пропускает
эти поля, чтобы HTTP-путь не писал беднее in-process.

## Возражение (Ожегов, `docs/discussions/plugin-results-bridge-b2.md`)

`passthrough` в DTO — теневой словарь: поля исполнителя становятся формой `plugin-results`
по факту, дрейф схемы молча.

## Развилка

1. Карман `payload: unknown` в `RunResult` контракта — DTO приёмника становится `.strict()`;
   класс по M1 уточнить (новое обязательное поле = breaking → ADR + консилиум).
2. Расширение в корне как норма (тот же приём, что у манифестов родов) — зафиксировать словами в
   контракте; `passthrough` тогда форма, не лазейка.

До решения `passthrough` остаётся с комментарием-ссылкой на #1982.
