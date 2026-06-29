# INSIGHT: Server forwarding — серверные функции сценария

| Поле | Значение |
|------|----------|
| **ID** | `insight-server-forwarding` |
| **Статус** | adopted |
| **Источник** | user |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Device-board сегодня выполняет почти всё на **клиенте**: Web Audio, FFT, MakeTrack, upload async job. Тяжёлые или секретозависимые операции (векторный RAG по звукам, сторонние API, batch ML) не имеют **первоклассного** контракта «узел → сервер». `StartAsyncJob` (Act IIb upload) — зачаток, но нет единой модели **Server forwarding**: что именно уезжает на сервер, как тарифицируется, какие интеграции нужны в кабинете.

## Гипотеза

**Server forwarding** — класс функций/процессов, которые сценарий **передаёт серверу** и **не выполняет на клиенте**:

1. Пользователь записал трек на device-board → узел `ForwardToServer` / server-scoped MakeReport → серверная обработка и интерпретация (пример: **векторная RAG-модель звуков**).
2. Функции **произвольные**: встроенные по тарифу + интеграции из кабинета + сторонние API.
3. **Кабинет:** пользователь настраивает интеграции, покупает **токены** на server actions.
4. **Bundled:** часть server functions **из коробки** по тарифу — без BYOK и без сторонних API.

### Разделение background-*

| Сервер | Роль в forwarding |
|--------|-------------------|
| `background-cabinet` | auth, tariff, token ledger, integration credentials, job status |
| `background-media` | blob ingest (track WAV), sample library |
| `background-office` | LLM/proxy, **не** хранение WAV (см. BACKGROUND_SERVERS) |
| **forwarding worker** (новый или media extension) | RAG embed, classify, webhook to 3rd party |

### Контракт узла (черновик)

- Palette node kind: `server-forward` / `invoke-server-function`
- Inputs: `TrackRef` | `AudioSampleRef` | `ReportRef` + `functionId` (catalog)
- Output: `ServerJobRef` → async poll or WS push → `InterpretationRef`
- Client: enqueue only; **no** model weights in browser

### Тарификация

| Тип | Оплата |
|-----|--------|
| Bundled (tier 1) | Включено в tariff `free-v1` / Pro лимиты |
| Integration (tier 2–3) | BYOK в cabinet + optional platform fee |
| Token meter | Debit per job / per minute audio / per API call |

Связь с `insight-agent-scenario-builder` (LLM tokens) — **отдельный** SKU или unified «AI credits» — решение Teamlead.

## Scope (черновик)

**In scope:**

- Каталог server functions (manifest + tariff tier)
- Cabinet: integrations UI, token wallet, job history
- Device-board nodes + async job bridge (расширение StartAsyncJob pattern)
- Пилот: track → server RAG interpret (INTEGRATIONS_STRATEGY tier 2)

**Out of scope (v0 insight):**

- Произвольный user code on server (sandbox)
- Замена client-side FFT/detectors tier 1
- office хранит audio blobs

## Связи

- `docs/BACKGROUND_SERVERS.md`, `docs/INTEGRATIONS_STRATEGY.md`
- `docs/RAG.md` — vector corpus; forwarding ≠ docs RAG, но тот же embed stack
- `insight-agent-scenario-builder` — tokens в cabinet
- competition async-v2 `StartAsyncJob` — upload precedent
- `MEMBRANE_PLATFORM_V1` — tariff enforcement

## Оператор видит

- В сценарии: узел «Server: Interpret track (RAG)» с badge tariff.
- В кабинете: подключённые интеграции, баланс токенов, очередь jobs.
- При нехватке токенов / нет интеграции — chain-log + UI gate (как feasibility в scenario builder).

## Вопросы для research (Q1–Q3)

1. **Landscape:** server-side nodes in low-code / visual workflows, hybrid client-server
2. **Fit:** audio upload → server RAG, Membrana background split, open-weights tier 2
3. **Risk:** latency, privacy, BYOK, token metering, не смешать office/media
