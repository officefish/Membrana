# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-26T12:00:00.000Z |
| Команда | консилиум (ручная фиксация; `yarn consilium` — блок API/proxy) |
| Модель | — (протокол по `CONSILIUM_PROMPT.md` + контекст DB3H-S3) |
| Файл | `docs/seanses/studio-host-smoke-registry-2026-06-26.md` |
| Порядок ролей | Teamlead → Структурщик → Математик → Музыкант → Верстальщик |
| Связанные документы | `STUDIO_HOST_LESSONS.md`, `STUDIO_HOST_BRIDGE_CONTRACT.md`, `DB3H_S3_STUDIO_HOST_SPRINT_PROMPT.md`, `USERCASE_COMPETITION_LESSONS.md` L20–L23 |

**Вопрос:**

Консилиум DB3H-S3: выявленные проблемы Studio smoke (run `f9939e7b` — bootstrap OK, gate-true 0); нужен ли реестр ошибок STx по образцу L1–L23; какие фазы добавить в эпик `membrana-studio-desktop` и спринт DB3H-S3; контракт desktop host на уровне архитектуры (browser | Studio | cabinet).

**Контекст smoke (2026-06-26):**

- Browser alpha async-v2: `c778c4ee` PASS (paired).
- Studio autonomous `f9939e7b`: fn-1 bootstrap PASS, 118 ticks, **gate-true 0**, journal `tracks=2 reports=0` (tracks вероятно от предыдущего run).
- Накопленные host-fixes (uncommitted): `resolveJournalBackend`, `getDeviceHandle` autonomous, `studio-dev` port probe, `mic-exact-fallback`, `resolve-input` active stream.

---

# Консилиум: Studio smoke, реестр STx и контракт трёх хостов

**Повестка:** (1) Реестр `STUDIO_HOST_LESSONS.md`; (2) новые фазы DB3H-S3 и MS6 эпика; (3) документ `STUDIO_HOST_BRIDGE_CONTRACT.md`; (4) разделение pack/runtime (L*) vs host/shell (ST*).

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Математик → Музыкант → Верстальщик (циклически)

---

[Teamlead]: Открываю с продуктового угла. UserCase async-v2 в браузере зелёный — это **runtime + pack** (L18–L23). Studio — **третий хост** с другими backend'ами: journal FS, media FS, Electron mic permission, dev URL. Ошибки здесь не дублируют L22 «нет fn-1»: у нас fn-1 **есть**, но gate не открывается. Значит нужен **отдельный дневник STx**, не смешивать с competition collapse. Реестр — обязателен до ST3 (installer smoke).

[Структурщик]: Согласен. Три слоя документации: (1) `USERCASE_COMPETITION_LESSONS` — programmatic pack/collapse; (2) `STUDIO_HOST_LESSONS` — host-bridge, Electron, backends; (3) `STUDIO_HOST_BRIDGE_CONTRACT` — нормативный контракт «один JSON → три entrypoint». В коде: `createScenarioRuntimeHost` в client, `resolveJournalBackend`, `resolveMediaLibraryBackend`, preload `electronAPI`. Запрещено чинить Studio в `membrana-studio/main` бизнес-логикой — только IPC/FS/paths.

[Математик]: Для smoke метрики разделяем. `yarn logs:parse` — **единый** критерий для browser и Studio. Пороги: gate-true ≥2, publish-done ≥2; upload-ok ≥2 только online. Offline ST2-J: reports на диске, upload-ok=0 — норма. Математическая ловушка run `f9939e7b`: 118 ticks ≠ 118 секунд; gate windowSec=5 по **wall-clock** `RecorderRecordingSession`. В лог добавляем `elapsedSec` на `is-recording-window-full` — иначе DevTools обрезает `full:` и мы слепы.

[Музыкант]: Микрофонный контур Studio: preset `microphoneId` в графе часто stale после смены устройства ОС — `mic-exact-fallback` правильный host-fix (ST4). `resolve-input` должен отдавать **активный** stream после StartStreaming (ST5), иначе fn-1 `invalid-stream`. Recording gate: если `elapsedSec` на tick 60 остаётся 0 при bootstrap — сессия сброшена между onStart и main; искать `resetCollectorSessions` / `stopAudioStreaming`, не pack. Unit-тест на bridge `isRecorderWindowFull` после 5 с — эталон.

[Верстальщик]: Operator smoke в Studio = autonomous + StorageRuntimeIndicator «Electron FS» + Run ≥3 мин. UI журнала должен показывать reports без cabinet. Для реестра STx — симптом в одну строку, как L22, плюс команда проверки (`yarn studio:journal-fs-check`). Чеклист перед закрытием ST2-J — в OPEN спринта, не в голове оператора.

[Teamlead]: Решение по реестру: **да**, файл `docs/device-board-scripts/STUDIO_HOST_LESSONS.md`, нумерация **ST1, ST2…**, перекрёстные ссылки на L* где runtime общий. Агент читает ST* перед DB3H-S3 и MS5 smoke.

[Структурщик]: Предлагаю фазы спринта DB3H-S3 дополнить: **ST5** — контракт + тесты host parity; **ST6** — реестр STx и ritual hook в `CLIENT_LOGS_PARSING.md`; **ST-GATE** — gate observability + закрытие open ST6 (elapsed). ST2-J остаётся блокером; ST5 параллелится с operator smoke.

[Математик]: ST-GATE acceptance: на tick ≥40 autonomous `elapsedSec ≥ 5`, `full: true`, `[recording] recording-window-full` ≥1 за run. Если нет — урок ST6 обновляем root cause, не закрываем спринт. Journal check: **очищать** `items.json` или фильтровать по `runStartedAtMs` — иначе ложный PASS по stale tracks (ST7).

[Музыкант]: В контракте фиксируем: **Web Audio только через audio-engine**; Studio не создаёт второй AudioContext в main. `getDeviceHandle()` в autonomous **всегда** `local-*` из `resolveDeviceBoardPersistDeviceId` — ST2. Paired Studio: deviceId из pairing, journal sync только при live cabinet token.

[Верстальщик]: MS6 эпика Studio — не installer, а **«Host Bridge Canon»**: одна таблица backends × режим × продукт. Rodchenko добавит в README Studio ссылку на контракт. Device (будущий) наследует subset контракта — только device-board + pairing, без media-library.

[Teamlead]: Эпик `membrana-studio-desktop`: после MS5 добавляем **MS6** — контракт трёх хостов + smoke matrix в CI (optional headless). MS5 (paired MP7) не блокирует ST2-J offline — подтверждаю приоритет Vesnin 26.06.

[Структурщик]: `STUDIO_HOST_BRIDGE_CONTRACT.md` в `docs/` (не в prompts): секции DeviceHandle, JournalBackend, MediaBackend, DevLauncher, ScenarioRuntimeHost parity, electronAPI IPC surface. Ссылка из `ARCHITECTURE.md` §client hosts и `MEMBRANE_PLATFORM.md` §Studio. Тесты: `createScenarioRuntimeHost.test.ts`, `resolveJournalBackend.test.ts`, `studio-dev.mjs` port probe.

[Математик]: Smoke matrix — таблица 3×2: (browser|Studio|cabinet future) × (online|offline). Одни пороги logs:parse. Cabinet defer — строка «deferred», не пусто. Метрика зрелости: % STx с закрытой профилактикой [x].

[Музыкант]: ST4/ST5 — не Studio-specific по сути, но **впервые проявились** в Electron mic enumeration. Переносим fix в `apps/client` — OK. В STx помечаем `hosts: [studio, browser]` чтобы не дублировать при cabinet. Recording re-arm L18 — общий с browser.

[Верстальщик]: `yarn studio:dev` — в контракте: Electron **обязан** получать фактический Vite URL (`MEMBRANA_STUDIO_DEV_URL`), не хардкод 5173 (ST3). Operator runbook: hard refresh после pull; очистить journal перед smoke; DevTools → `logs/apps/client/logs.txt` без обрезки `…` (или copy scenario trace).

[Teamlead]: Риски: (1) смешение ST и L в одном PR — разделяем коммиты; (2) gate ST6 open блокирует ST2-J DoD; (3) без реестра повторим port mismatch на Device. Принимаю: реестр + MS6 + ST5/ST6/ST-GATE в DB3H-S3 OPEN.

[Структурщик]: Ritual: вечерний code-review при Studio sprint — grep `STUDIO_HOST_LESSONS` на новый симптом; если новый — ST+1 с датой и runId. Аналог `USERCASE_COMPETITION_LESSONS` closure table внизу файла.

[Математик]: `studio:journal-fs-check` расширить опционально `--since-run` когда в items.json появится runId в metadata — backlog, не блокер. Пока ST7: документировать «очистить journal перед smoke».

[Музыкант]: Async upload offline: tracks в journal через electron-fs media path — отдельный ST когда upload-ok=0 но tracks есть. Не путать с gate ST6. Trends publish sync — publish-done должен расти даже offline.

[Верстальщик]: MS6 UI: в About/Settings Studio — режим (autonomous/paired), путь APPDATA, версия shell. Минимум для оператора — уже есть StorageRuntimeIndicator; достаточно для ST2-J.

[Teamlead]: Финал. Все пять ролей **принимают**: реестр STx; контракт MS6; фазы ST5/ST6/ST-GATE; ST2-J остаётся обязательным; cabinet host вне scope.

---

## Итоговое решение консилиума

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Нужен ли реестр ошибок Studio? | **Да** — `docs/device-board-scripts/STUDIO_HOST_LESSONS.md`, нумерация ST1…, по образцу L1–L23 |
| 2 | Разделение L* vs ST* | **L*** = pack/collapse/runtime graph; **ST*** = host bridge, Electron, backends, dev launcher |
| 3 | Новые фазы DB3H-S3 | **ST5** Host parity contract + tests; **ST6** Registry + logs ritual; **ST-GATE** gate elapsed observability + fix ST6 open item |
| 4 | Новая фаза эпика Studio | **MS6** — `STUDIO_HOST_BRIDGE_CONTRACT.md` + smoke matrix (browser / Studio / cabinet deferred) |
| 5 | Приоритет спринта | **ST2-J offline journal** остаётся блокером; ST5/ST6 параллельно; MS5 MP7 — follow-up |
| 6 | Архитектурный артефакт | `docs/STUDIO_HOST_BRIDGE_CONTRACT.md`, ссылки из `MEMBRANE_PLATFORM.md`, `MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`, `apps/membrana-studio/README.md` |
| 7 | Gate run `f9939e7b` | Bootstrap OK, gate-true 0 — **ST6 open**; диагностика через `elapsedSec` в логах; journal stale — **ST7** |

### Definition of Done (артефакты консилиума)

- [x] Протокол в `docs/seanses/studio-host-smoke-registry-2026-06-26.md`
- [x] `STUDIO_HOST_LESSONS.md` создан, ST1–ST8 зафиксированы
- [x] `STUDIO_HOST_BRIDGE_CONTRACT.md` — канон трёх хостов
- [x] OPEN DB3H-S3 + промпт спринта + эпик MS6 обновлены
- [ ] ST-GATE closed: operator smoke `gate-true ≥2`, `reports ≥2` autonomous
- [ ] ST2-J closed: `yarn studio:journal-fs-check` PASS на чистом journal

### Таблица фаз (обновлённая)

| Phase | Deliverable | Owner |
|-------|-------------|-------|
| ST0–ST1 | dev baseline + UserCase load | Ozhegov |
| **ST2-J** | offline journal (обязательно) | Ozhegov |
| ST2-O | online paired smoke | Vesnin |
| ST3 | NSIS + installed offline smoke | Rodchenko |
| ST4 | MP7 paired runbook | Vesnin (deferred) |
| **ST5** | Host Bridge Contract + unit tests | Ozhegov |
| **ST6** | STUDIO_HOST_LESSONS registry + parse ritual | Vesnin |
| **ST-GATE** | recording gate parity Studio = browser | Kuryokhin |
| **MS6** (epic) | Canon doc + smoke matrix в README/platform | Vesnin |
