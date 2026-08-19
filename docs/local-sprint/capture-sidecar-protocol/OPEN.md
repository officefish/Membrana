# Membrana Local Sprint OPEN: capture-sidecar-protocol

| Поле | Значение |
|------|----------|
| Sprint | `capture-sidecar-protocol` |
| Procedure | `membrana-local-sprint` |
| Registry card | `capture-sidecar-protocol` (без Issue до ратификации формы) |
| Plan | [`docs/sprint/cut/capture-sidecar-protocol.json`](../../sprint/cut/capture-sidecar-protocol.json) |
| Prompt | [`docs/prompts/CAPTURE_SIDECAR_PROTOCOL_PROMPT.md`](../../prompts/CAPTURE_SIDECAR_PROTOCOL_PROMPT.md) |
| Cutter | `kuryokhin` |
| Team | `dynin` · `ozhegov` |
| Status | GATE PASS 4/4 `honest_pair` · experience `hit` |

## Предмет

Строгий JSON-спутник рядом с каждой полевой записью, повторяемый порядок съёмки,
fail-closed проверка и приёмка на одной живой записи узла.

## Блоки

| Блок | Ответственный | Выход |
|------|---------------|-------|
| `sidecar-form` | `dynin` | два непересекающихся раздела и запись спутника рядом с WAV |
| `capture-order` | `kuryokhin` | длительности, дистанции, повторы, классы и именование |
| `checker-command` | `ozhegov` | `capture:sidecar --check` и отрицательные зубы |
| `live-acceptance` | `kuryokhin` | проверенный спутник к живой записи и процедурные следы |

## Гейты

1. Владелец ратифицирует неизменённое тело cut-плана до кода.
2. `declared` не пуст и не содержит измеряемых полей.
3. `measured` сформирован только инструментом и не содержит объявленных полей.
4. Запись и спутник связаны именем и идентификатором.
5. Живая запись узла проходит тем же публичным глаголом.

## Не делаем

- Не проектируем пакетный рантайм.
- Не создаём реестр спутников.
- Не исправляем #1950 и не расширяем серверный ingestion.
