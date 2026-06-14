# Промпт: Media Library A3 — плагин записи в буфер

> **Task-промпт для агента-разработчика** · фаза **A3** · размер **M**  
> Реестр: `media-library-a3-mic-recorder` · ожидаемый артефакт: **1 PR** (hub + плагин + bridge).  
> Зависит от: `media-library-a1-storage`, `media-library-a2-ui` (архив).

---

## Контекст

Фазы **A1** ( `@membrana/media-library-service` ) и **A2** ( модуль «Библиотека сэмплов» ) завершены. Коллекция `__buffer__` принимает импорт с диска; запись с микрофона — **фаза A3**.

Плагин живёт на модуле **«Микрофон»**, использует **уже открытый** `MediaStream` (`microphoneStreamHub`, `microphoneCaptureCoordinator`). В `media-library-service` **не импортируется** из плагина — только hub-события → bridge → `importBlob(__buffer__)`.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | §5.3, §7 hub, buffer rules |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Регистрация плагина, sidebar, teardown |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1b engine, §1c слабая связанность |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, a11y |
| [`HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md`](./HARMONIC_DETECTOR_MICROPHONE_PLUGIN_PROMPT.md) | Эталон: coordinator + hub + install/teardown |

**GitHub Issue:** — (по желанию Teamlead; закрытие через `yarn task:archive`).

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

---

### Что построить

**Плагин `mic-buffer-recorder`** («Запись в буфер») на модуле `microphone`:

1. **Ручная запись (`manual`)** — старт/стоп пользователем; автостоп не позже **30 с**; пресеты **3 / 5 / 7 / 10 / 15 / 30 с** задают целевую длительность (`min(пресет, 30)`).
2. **Автоматическая запись (`auto`)** — toggle; длина одного клипа **1–3 с** (бегунок); пресеты **3–30 с** — **интервал между клипами**; не более одного активного клипа.
3. **Форматы:** WAV (PCM→encode, 48 kHz mono), WebM, MP4 через `MediaRecorder` с `isTypeSupported` и graceful fallback.
4. **Блок памяти:** quota used/limit, счётчик сэмплов в `__buffer__`, кнопка «Очистить буфер» (confirm) → сброс счётчика; блокировка записи при 100% quota / `maxBufferSamples`.
5. **Hub → buffer:** по завершении клипа — `media-library.capture.stop` + blob → bridge → `MediaSample` в `__buffer__`.

Поток микрофона должен быть **live** (`requestMicrophoneStart` / coordinator). Без потока — понятная ошибка.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Hub (типы + pub/sub) | `packages/services/media-library/src/hub-events.ts`, `apps/client/src/lib/mediaLibraryHub.ts` | Контракт событий |
| Bridge | `apps/client/src/lib/mediaLibraryHubBridge.ts` | `capture.stop` → `importBlob`; quota/buffer → hub |
| Плагин | `apps/client/src/plugins/mic-buffer-recorder/` | UI, MediaRecorder/PCM, publish hub |
| Сервис | `@membrana/media-library-service` | `__buffer__`, quota, `clearBuffer` (без изменений UI) |
| Модуль микрофона | `MicrophoneModule` | Owner потока (не трогать захват) |

**Hub-события (издатель — плагин; подписчик — bridge):**

| Событие | Назначение |
|---------|------------|
| `media-library.capture.start` | `{ mode, format, targetDurationSec?, clipLengthSec?, intervalSec? }` |
| `media-library.capture.stop` | `{ reason, blob, meta }` → commit в buffer |
| `media-library.capture.cancel` | отмена без commit |

**Hub (bridge → UI):** `media-library.quota.updated`, `media-library.buffer.cleared` — для блока памяти в плагине.

**Запрещено:**

- Второй `getUserMedia` в плагине.
- Прямой `import` `@membrana/media-library-service` из плагина.
- Запись без teardown при `deactivatePlugin` / stop потока.

**Auto-триггер (v1):** периодический — каждые `intervalSec` с клипом длины `clipLengthSec`, пока toggle «Авто» включён и поток live. VAD — out of scope v2.

---

### UI (DaisyUI)

Секции панели плагина:

1. Режим: Ручной | Авто  
2. Manual: Start/Stop, таймер `elapsed/limit`, пресеты 3–30 с  
3. Auto: toggle, range 1–3 с, пресеты интервала 3–30 с  
4. Формат: WAV / WebM / MP4  
5. Память: progress/quota, «N сэмплов», «Очистить буфер»  
6. Ошибки: `alert alert-error`, `role="alert"`

Sidebar (`pluginSidebarDetails.tsx`): формат по умолчанию, режим по умолчанию.

Референс UX захвата: `MicCaptureControls` в `harmonic-detector-viz`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Hub | publish/subscribe, bridge вызывает `importBlob` на mock |
| Manual timer | автостоп ≤30 с, clamp пресетов |
| Teardown | stop recorder при uninstall |
| `yarn workspace @membrana/client typecheck` | OK |

---

### Definition of Done

- [ ] Плагин `mic-buffer-recorder` зарегистрирован на `microphone` в `registerClientModules`
- [ ] Manual: start/stop, пресеты, автостоп ≤30 с
- [ ] Auto: бегунок 1–3 с, интервал 3–30 с, клипы в `__buffer__`
- [ ] Форматы: WAV + WebM или MP4 с fallback UI
- [ ] Блок памяти: quota, count, clear → count=0
- [ ] Hub bridge в `main.tsx`; плагин без import сервиса
- [ ] Smoke: запись → «Библиотека сэмплов» → move в коллекцию
- [ ] `yarn workspace @membrana/media-library-service test` + client typecheck зелёные
- [ ] LGTM Teamlead

---

### Out of scope

- IndexedDB persistence (A1 v1 in-memory OK)
- Mic hub modal «Сохранить в коллекцию» (можно A3.1)
- VAD-триггер auto
- Electron FS backend (A4)
- Export manifest (A6)

---

### Порядок работы ролей

1. **Teamlead** — LGTM hub-контракта и трактовки пресетов  
2. **Структурщик** — hub, bridge, plugin install/teardown  
3. **Музыкант** — WAV 48 kHz, MediaRecorder codecs  
4. **Верстальщик** — панель, a11y, sidebar  
5. **Математик** — таймеры, clamp длительностей (unit tests)

---

## Заметки для человека-постановщика

1. Задача зарегистрирована: `media-library-a3-mic-recorder`.
2. Параллельна `#47` — не блокирует Single-Node gate (см. ARCHITECTURE §1e).
3. После merge: `yarn task:archive media-library-a3-mic-recorder --notes "…"`.

### Проверка после PR

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/client typecheck
yarn workspace @membrana/client dev
# Микрофон → плагин «Запись в буфер» → запись → Библиотека сэмплов
```

---

## Связь с дорожной картой

- Фаза **A3** [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) §8  
- Датасет / benchmark: move из buffer → system collection → A6 manifest
