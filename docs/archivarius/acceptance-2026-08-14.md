# Приёмка контейнера сессий Archivarius — 2026-08-14

Магистраль дня 14.08 (owner-choice из замороженного топ-3, гейт `morning-gates-state.json`).
Утренний `yarn main-day-probe` опроверг все три посылки плана фактическими маркерами:
контейнер построен 27.07–04.08 (PR [#1335](https://github.com/officefish/Membrana/pull/1335) →
[#1407](https://github.com/officefish/Membrana/pull/1407) → [#1711](https://github.com/officefish/Membrana/pull/1711)),
план трёх дней предлагал строить построенное под предсказанными именами (класс marker-fix-17-07).
День переведён из «построить» в «принять» словом владельца.

## Сверка acceptance Issue [#1330](https://github.com/officefish/Membrana/issues/1330)

| Пункт acceptance | Вердикт | Свидетельство |
|---|---|---|
| repo home `docs/archivarius/` (README + workshop.manifest.json) | ✅ | оба файла в стволе |
| atlas пересобран после манифеста | ✅ | `yarn tooling:atlas --check`: «производные свежи» (14.08) |
| office stack: MongoDB service/config | ✅ | PR #1711 (live-wiring), 106 884 спана залиты 04.08 |
| API/CLI: span by `{sessionId, uuid}` → `{bytes, sha256}` | ✅ | живой след ниже: GET span, sha сошёлся |
| audit/decompose/inspect/search детерминированы, тесты рядом | ✅ | `archivarius.service.ts` + `archivarius.mongo-store.ts`, зубы рядом; `searchSpans` покрыт |
| local transcript ingest маскирует секреты, отчёт несёт `maskedLines` | ✅ | боевой прогон 14.08: `maskedLines: 69` в отчёте тракта |
| evidence bridge `--store archivarius --ref span://…` | ✅ | глагол в `scripts/evidence.mjs` (usage подтверждает контракт) |
| secret boundary: полные сессии до вехи `secret-parser-built` не пишутся | ✅ | резак в пути extract (`ingestJsonlText`), maskedCuts без значений |

## Живой след (боевой прогон 14.08)

Заливка: `yarn archivarius:push` — файлов 173, спанов 111 074, принято 111 073,
батчей 469, замаскировано строк 69.

Изъятие спана сегодняшней утренней сессии обратно из office:

```json
{
 "trace": "GET /v1/archivarius/span — живой след приёмки 2026-08-14",
 "sessionId": "6449bfa2-f960-40c2-8426-a6f4aed711ff",
 "uuid": "f36c8bc4-d21c-662c-c0c6-9aefad9a2ca1",
 "ts": "2026-08-14T02:50:57.989Z",
 "officeSha256": "62f008224aadaea345a8cebd68510b180952e046b092e35ddbe867fbf1501f75",
 "localSha256OfBytes": "62f008224aadaea345a8cebd68510b180952e046b092e35ddbe867fbf1501f75",
 "shaMatch": true,
 "bytesLength": 138
}
```

## Находка приёмки и фикс

До 14.08 одиночный спан крупнее лимита тела office (HTTP 413) **обрывал тракт целиком** —
хвост заливки молча терялся (виновник: спан 1 781 820 байт,
`139af2d5…/d65664f7…`). Контракт изменён: одиночный 413 — именованный пропуск
(`oversizedSkipped: [{sessionId, uuid, bytes}]` в отчёте, содержимое не печатается),
тракт продолжается. Зубы: 13/13 (`scripts/archivarius.test.mjs`).

Остаток named: судьба спана-гиганта — развилка (поднять лимит office / резать спан
на части / оставить пропуск нормой) — кандидат в санитарные следующего дня, адрес
в отчёте тракта.
