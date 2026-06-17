# Промпт (эпик): Cabinet journal hotfix — media API, preload, brief render, trends detection

> Размер: **M** (6 подзадач CJ-0…CJ-5).
> Реестр: `id` = `cabinet-journal-hotfix`.
> Основание: ручное тестирование кабинета 2026-06-17 (5 замечаний QA).

---

## Контекст

При ручном тесте `cabinet.membrana.space` выявлены:

1. `[useMediaLibrary] init failed` — HTML вместо JSON (неверный media API URL).
2. Журнал «висит» на прелоадере при 200 на `/v1/telemetry/journal-items` каждую секунду.
3. Нет рендера `drone-detection-brief/v1` в серверном журнале (parity gap LP5).
4. Brief от mic-live-drone появляется с задержкой (pipeline + sync + poll).
5. Trends FFT помечает «обнаружение» при победе не-дрон шаблона.

**Ветка:** `techies68`.

**Связанные документы:** [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md), [`DESIGN.md`](../DESIGN.md), [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md), [`SERVICES.md`](../SERVICES.md).

---

## Подзадачи (порядок)

| ID | Содержание | Lead | Пакеты |
|----|------------|------|--------|
| **CJ-0** | Фильтр `enabledTemplateKeys` + UI DRONE_TIGHT | Dynin | `apps/client` |
| **CJ-1** | Media API: safe JSON, понятная ошибка HTML | Ozhegov | `media-library-service`, `apps/cabinet` |
| **CJ-2** | Развязка journal/media load; poll без full crawl | Ozhegov + Rodchenko | `apps/cabinet` |
| **CJ-3** | Brief render parity в кабинете | Rodchenko | `journal-report-views`, `apps/cabinet` |
| **CJ-4** | `countsAsDetection` в trends + журнал | Dynin | `trends-detector-service`, `apps/client` |
| **CJ-5** | Sync push warn + incremental poll | Ozhegov | `telemetry-journal-service` |

---

## DoD эпика

- [ ] Кабинет: журнал открывается <1 с при живом telemetry API; спиннер не блокируется media init.
- [ ] `drone-detection-brief/v1` раскрывается в кабинете (таблица вердиктов).
- [ ] Trends: победа WIND/QUIET при высоком score → «Чисто», не «Обнаружение».
- [ ] Media init: ошибка «HTML вместо JSON» с указанием baseUrl, не SyntaxError.
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный для затронутых пакетов.
- [ ] Ручной QA: журнал, brief-карточка, trends detection filter, sample library без init failed.

---

## Out of scope

- WebSocket/SSE для журнала.
- Новые детекторы / калибровка DRONE_TIGHT.
- Prod deploy (отдельный ритуал).

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Исправь 5 замечаний QA кабинета по подзадачам CJ-0…CJ-5. Не нарушай границы пакетов: cabinet ↔ client через `@membrana/journal-report-views`. Web Audio только через audio-engine. Закрытие: PR в `techies68`, `yarn task:archive cabinet-journal-hotfix` после merge.
