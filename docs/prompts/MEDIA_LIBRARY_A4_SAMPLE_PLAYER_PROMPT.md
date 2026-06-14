# Промпт: Media Library A4 — воспроизведение, экспорт и плеер с осциллограммой

> **Task-промпт для агента-разработчика** · фаза **A4** · размер **M**  
> Реестр: `media-library-a4-sample-player` · ожидаемый артефакт: **1 PR** (сервис + hub + модуль + плагин).  
> Зависит от: `media-library-a1-storage`, `media-library-a2-ui` (архив); совместим с `media-library-a3-mic-recorder` (активна).

---

## Контекст

Фазы **A1** (`@membrana/media-library-service`, `readBlob` на backend) и **A2** (модуль «Библиотека сэмплов»: коллекции, import, move, quota) завершены. **A3** добавляет запись в буфер с микрофона. Сейчас в таблице сэмплов **нет** play/export и нет крупного плеера с визуализацией.

По [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) §1: библиотека — **не** медиаплеер; воспроизведение — через `@membrana/audio-engine-service` (`BufferPlayer`, `loadAudioBuffer`). Фаза **A4** закрывает продуктовый gap: прослушивание и выгрузка сэмплов + дублирующий UI плеера.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | §3 слои, `readBlob`, preview/play |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Плагин на модуле `sample-library`, sidebar |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1b engine, §1c слабая связанность |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI, a11y, состояния loading/empty |
| [`MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md`](./MEDIA_LIBRARY_A3_MIC_RECORDER_PROMPT.md) | Паттерн hub + bridge (без прямого import сервиса из плагина — **не применяется** к A4: плеер на модуле библиотеки) |

**GitHub Issue:** — (создать Teamlead при triage; закрытие через `yarn task:archive`).

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

**Цель:** любой сэмпл в библиотеке можно **прослушать**, **перемотать** по осциллограмме и **экспортировать** на диск. В модуле «Библиотека сэмплов» — компактный inline-плеер; на том же модуле — **плагин с крупным дублирующим плеером** (тот же источник правды, не второй `AudioContext`).

#### 1. Воспроизведение сэмплов (модуль `sample-library`)

- В таблице сэмплов: кнопки **▶ Play / ⏸ Pause** (или toggle) и индикатор «сейчас играет» для активной строки.
- Клик по строке (или по названию) **выбирает** сэмпл как «текущий» для плеера (модуль + плагин синхронизированы).
- Декодирование: `readBlob(sampleId)` → `loadAudioBuffer` / `decodeAudioData` через `@membrana/audio-engine-service`.
- Один активный плеер на модуль: при выборе другого сэмпла — stop предыдущего.
- Состояния: loading (decode), playing, paused, ended, error — с понятным UI (`role="status"`, `alert` при ошибке).

#### 2. Экспорт сэмплов

- Кнопка **«Экспорт»** / иконка download в строке таблицы и в крупном плеере.
- Скачивание исходного blob (`backend.readBlob`) с именем файла `{title}.wav` (или расширение из mime, fallback `.wav`).
- Без серверного round-trip: только клиентский `URL.createObjectURL` + `<a download>`.
- Экспорт **не** удаляет сэмпл из библиотеки.

#### 3. Плагин `sample-library-player` — крупный дублирующий плеер

- Регистрация: `MembranaRegistry.registerPlugin('sample-library', createSampleLibraryPlayerPlugin())`.
- Панель плагина — **основной** крупный плеер (min-height осциллограммы ~120–160px, см. DESIGN).
- Показывает: название, коллекцию, class/label, длительность, play/pause, stop, export.
- **Синхронизация** с inline-плеером модуля: один shared controller/hub — выбор сэмпла, позиция, play state общие.
- Если сэмпл не выбран — empty state: «Выберите сэмпл в таблице».

#### 4. Осциллограмма (waveform) как интерактивный progress bar

- Статическая **осциллограмма всего трека** (peak envelope, даунсэмпл до N точек, напр. 512–1024) — строится один раз после decode, кэш по `sampleId`.
- Во время воспроизведения: **playhead** (вертикальная линия или заливка «пройденного» участка) движется по waveform.
- **Интерактивность (обязательно):**
  - клик по waveform → seek на соответствующую позицию (0…duration);
  - drag по waveform → scrub с throttle (~50ms);
  - keyboard: стрелки ←/→ — шаг 1 с (с `aria-valuenow` / `role="slider"` на контейнере waveform).
- Waveform — **не** live FFT; это envelope декодированного `AudioBuffer`.
- Референс даунсэмплинга: `micStreamVizPlugin.ts` (WF_LEN точек), но для **файла**, не live-потока.

#### 5. Расширение engine (если нужно для seek)

Текущий `BufferPlayer` умеет `play(buffer)` с offset 0 и `stop()`, **без seek**.

- Добавить в `@membrana/audio-engine-service`:
  - `play(buffer, options?: { startOffsetSec?: number })` **или** `seek(offsetSec)` + отслеживание `currentTimeSec`;
  - событие/progress callback для UI (`onProgress?: (currentSec, durationSec) => void`) или polling через `audioContext.currentTime - startedAt`.
- Обновить `useBufferPlayer` зеркально.
- Unit-тесты на чистую логику offset (без Web Audio в headless — допустим mock или тест только math peaks).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Backend | `IStorageBackend.readBlob` | Уже есть |
| Сервис | `@membrana/media-library-service` | `getSampleBlob(sampleId): Promise<Blob>` — тонкая обёртка над `backend.readBlob` |
| Waveform utils | `apps/client/src/lib/sampleWaveform.ts` (или `packages/services/media-library/src/waveform.ts` если pure) | `computePeakEnvelope(AudioBuffer, pointCount)` |
| Playback hub | `apps/client/src/lib/sampleLibraryPlaybackHub.ts` | Выбранный `sampleId`, play/pause/seek, подписчики (модуль + плагин) |
| Модуль | `apps/client/src/modules/SampleLibraryModule.tsx` | Таблица + compact player strip / row actions |
| Плагин | `apps/client/src/plugins/sample-library-player/` | Крупный плеер + waveform |
| Engine | `@membrana/audio-engine-service` | `BufferPlayer` seek/progress, `loadAudioBuffer` |

**Запрещено:**

- Второй параллельный `AudioContext` для того же сэмпла (модуль и плагин делят hub/controller).
- Прямой доступ плагина к `IStorageBackend` — только через `useMediaLibrary().service.getSampleBlob`.
- Импорт плагинов микрофона в модуль библиотеки.
- Блокирующий decode всего каталога при открытии модуля (decode **по требованию** при Play/Select).

**Hub (опционально v1):** достаточно in-memory `sampleLibraryPlaybackHub` в `apps/client`; отдельные `media-library.playback.*` события — только если hub разрастается (предпочтение v1: один TS-модуль hub).

---

### Визуальный дизайн (DaisyUI)

**Модуль (compact):**

- В toolbar над таблицей или под заголовком коллекции — узкая полоса: play/pause, время `mm:ss / mm:ss`, мини-waveform (высота ~32–48px) с seek.
- В строке таблицы: play (если не активная), export, удалить (как сейчас).

**Плагин (large):**

- Карточка `card bg-base-200/40` на всю ширину панели.
- Waveform на всю ширину, высота 120–160px, `cursor-pointer`, hover-подсветка позиции.
- Playhead: `bg-primary` overlay или vertical rule.
- Кнопки: `btn btn-circle` play/pause, `btn btn-ghost` export.
- `h-full min-h-0` — без прыгающего scrollbar ([`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md)).

**a11y:**

- Waveform: `role="slider"`, `aria-valuemin={0}`, `aria-valuemax={durationSec}`, `aria-label="Позиция воспроизведения"`.
- Кнопки: `aria-label` на icon-only.
- Loading: `aria-busy="true"`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| `computePeakEnvelope` | детерминированный вывод для синуса / константы |
| `sampleLibraryPlaybackHub` | select → play state, подписчики получают snapshot |
| `getSampleBlob` | mock backend, проброс `readBlob` |
| Client | `yarn workspace @membrana/client test` — новые unit-тесты hub/waveform |
| Engine | тест offset math или seek API (если добавлен) |

Ручная проверка (Музыкант): import WAV → play → scrub waveform → export → файл совпадает по длительности. Headless «no device» — не блокер CI.

---

### Definition of Done

- [ ] `MediaLibraryService.getSampleBlob(sampleId)` экспортирован из пакета
- [ ] В `SampleLibraryModule`: play/pause, export, выбор текущего сэмпла
- [ ] Плагин `sample-library-player` зарегистрирован на модуле `sample-library`
- [ ] Крупный плеер синхронизирован с модулем (один hub, один playback)
- [ ] Осциллограмма отображает envelope; клик/drag перематывают трек
- [ ] Playhead обновляется во время воспроизведения
- [ ] Export скачивает исходный blob
- [ ] Empty/loading/error состояния в UI
- [ ] `yarn workspace @membrana/media-library-service test` + client typecheck/test зелёные
- [ ] `yarn turbo run lint typecheck test build --filter=@membrana/client --filter=@membrana/media-library-service --filter=@membrana/audio-engine-service --continue` — зелёный
- [ ] LGTM Teamlead

---

### Out of scope

- Плейлист / автопереход к следующему сэмплу
- Редактирование метаданных (class/label) в плеере
- Export manifest / ZIP всей коллекции (отдельная задача benchmark)
- Pitch/tempo, loop, A-B repeat
- Electron FS backend (только browser-limited в v1)
- Визуализация спектрограммы (только waveform envelope)

---

### Порядок работы ролей

1. **Teamlead** — согласовать seek API в engine vs client-only workaround; Issue при triage.
2. **Структурщик** — hub + один AudioContext; граф зависимостей client → engine + media-library.
3. **Математик** — `computePeakEnvelope`, маппинг x → `offsetSec`, unit-тесты.
4. **Музыкант** — ручной smoke: тишина / речь / длинный WAV; scrub без щелчков (приемлемый уровень).
5. **Верстальщик** — крупный плеер, a11y slider, empty states.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`): «Воспроизведение и экспорт сэмплов + плеер с осциллограммой» + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`, `id: media-library-a4-sample-player`).
3. После merge: `yarn task:archive media-library-a4-sample-player --notes "…"`.

### Проверка после PR

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/client test
yarn turbo run lint typecheck --filter=@membrana/client --filter=@membrana/audio-engine-service --continue
```

Ручной smoke: модуль «Библиотека сэмплов» → import WAV → play в таблице → открыть плагин «Плеер» → scrub → export.

---

## Связь с дорожной картой

- Фаза **A4** цепочки Media Library (после A3 mic-recorder).
- Подготовка к export manifest системной коллекции (`DATASET.md`, stage-gate) — пользователь сможет **слушать** сэмплы перед разметкой.
