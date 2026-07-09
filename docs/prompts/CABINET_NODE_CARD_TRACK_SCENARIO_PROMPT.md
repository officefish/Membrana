# Промпт: Node card — сценарная ячейка под треком + waveform-оформление трека

> **Task-промпт для агента-разработчика.**
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Размер: **M**.
> Ожидаемый артефакт: **1 PR** — переработка node card в кабинете (2 логических коммита S1/S2).
> Реестр: `id` = `cabinet-node-card-track-scenario`. GitHub Issue: #318.

---

## Контекст

Кабинетная node card ([`apps/cabinet/src/pages/NodesPage.tsx`](../../apps/cabinet/src/pages/NodesPage.tsx))
сейчас держит выбор сценария (`CabinetScenarioPicker`, dropdown) **в строке кнопок управления**
(`Пуск/Стоп/Отпустить`), а «последний трек» ([`NodeLastTrackPreview.tsx`](../../apps/cabinet/src/components/nodes/NodeLastTrackPreview.tsx))
показан голым `<audio controls>`. Задача — развести сценарий в отдельную ячейку под треком и
привести трек к виду библиотеки семплов с waveform-гистограммой.

Обсуждено виртуальной командой (5 ролей): чисто кабинетный UI, границы сервисов не трогаем.

**Связанные документы / код:**

| Документ / файл | Зачем |
|-----------------|--------|
| `apps/cabinet/src/components/CabinetScenarioPicker.tsx` | текущий dropdown-picker (csp-5) |
| `apps/cabinet/src/components/sample-playback/SampleWaveformScrubber.tsx` | целевой waveform-визуал |
| `apps/cabinet/src/components/journal/JournalTrackPlaybackSection.tsx` | эталон использования scrubber |
| `@membrana/sample-playback-service` → `computePeakEnvelope`, `SAMPLE_PLAYBACK_WAVEFORM_POINTS` | пики из декодированного буфера |
| [`DESIGN.md`](../DESIGN.md), `LIVE_DETECTION_UI.md` | UI-каноны |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana под Vesnin. Ведёт **Верстальщик (Rodchenko)**,
границы — **Структурщик (Ozhegov)**, waveform-данные — **Музыкант (Kuryokhin)**.

### Что построить

**S1 — Сценарная ячейка под треком.**
1. Вынести `CabinetScenarioPicker` из строки кнопок (`NodesPage` ~390–407) в отдельную ячейку
   **под** `NodeLastTrackPreview`.
2. Свёрнутый вид: «Сценарий: `<выбранный>`» + кнопка-раскрытие (▾). Раскрытый: группы
   «Пользовательские | Системные» карточками (переиспользовать рендер `ScenarioGroup` /
   `UserCaseCardView`).
3. Collapsible: управляемый `useState` или `<details>`; `aria-expanded`/`aria-controls`,
   `role="region"`. Выбранный сценарий виден и в свёрнутом виде.

**S2 — Waveform-оформление трека.**
1. `NodeLastTrackPreview`: заменить голый `<audio>` на waveform-гистограмму `SampleWaveformScrubber`
   (визуал как в библиотеке семплов).
2. Данные пиков: **по клику** (offline-safe, как сейчас) — грузим blob узла
   (`fetchNodeTrackBlobUrl`), декодируем через audio-engine, `computePeakEnvelope(mono, N)` →
   `waveform`. Воспроизведение + `currentTimeSec`/seek синхронизированы (audio-элемент или
   sample-playback), скраббинг работает.
3. Никакого сырого Web Audio (правило кабинета) — декод через audio-engine/sample-playback.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| UI | `NodesPage.tsx` (node card) | раскладка: кнопки → трек → сценарная ячейка |
| UI | новый `NodeScenarioCell.tsx` (или в picker) | collapsible-контейнер сценариев |
| UI | `NodeLastTrackPreview.tsx` | waveform-гистограмма по клику |
| reuse | `@membrana/sample-playback-service` | `computePeakEnvelope`, scrubber-визуал |

**Запрещено:**
- Ломать csp-5 семантику: `canSelect`, tariff-бейджи, locked-системные (апселл).
- Менять выбор-состояние (остаётся в `scenarioList.selectedScenarioId`); «Пуск» берёт его.
- Сырой `new AudioContext` / `getUserMedia` / `decodeAudioData` в кабинетном компоненте.
- Трогать shared-сервисы (sample-playback/media) и wire-контракт.

### Визуальный дизайн

- Порядок node card: строка кнопок → трек (waveform) → сценарная ячейка (collapsible).
- Трек: `SampleWaveformScrubber` (compact, height ~56), офлайн — деградация «Прослушать/Показать».
- a11y: expander кнопкой с `aria-expanded`; статичные подписи, без прыгающего scrollbar.

### Тесты

| Область | Минимум |
|---------|---------|
| Сценарная ячейка | collapsible toggle, выбранный виден свёрнутым, `canSelect` цела (unit на pure-хелперы) |
| Waveform | пики строятся из буфера (переиспользуем `computePeakEnvelope`); показ по клику |
| Регрессия | существующие `CabinetScenarioPicker.test`, cabinet suite зелёные |

### Definition of Done

- [ ] Picker под треком, collapsible с a11y; csp-5 семантика цела; «Пуск» работает.
- [ ] Трек — waveform-гистограмма как в библиотеке (по клику, offline-safe), seek работает; без сырого Web Audio.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/cabinet` зелёный.
- [ ] `yarn check:boundaries` зелёный; ручной smoke на живом узле (в evidence — при наличии браузера).
- [ ] LGTM Teamlead.

### Out of scope

- Изменения сервера/контракта журнала (пики в метаданных трека).
- Автозагрузка waveform (решено: **по клику**).
- Продуктовая логика сценариев/детекции.

### Порядок ролей

1. **Teamlead** — scope, LGTM.
2. **Структурщик** — границы кабинета, csp-5 семантика, никаких shared-сервисов.
3. **Музыкант** — waveform-данные (декод blob → `computePeakEnvelope`), offline-деградация.
4. **Верстальщик** — раскладка, collapsible, a11y, визуал трека.

---

## Заметки для человека-постановщика

1. GitHub Issue #318 + ссылка на этот файл.
2. registry.json (`status: active`, `size: M`, `githubIssue: 318`, `leadPersona: rodchenko`).
3. После merge: отчёт в Issue → `yarn task:archive cabinet-node-card-track-scenario --notes "PR #…"`.

### Проверка после PR

```bash
yarn turbo run lint typecheck test --filter=@membrana/cabinet
yarn check:boundaries
```

---

## Связь с дорожной картой

- Продуктовая упаковка кабинета (UX-паритет с клиентом); эпик `cabinet-scenario-picker-system`
  (csp-*) задал сценарный контур — эта задача улучшает его размещение и оформление трека.
