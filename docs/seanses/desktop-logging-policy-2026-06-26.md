# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-26 |
| Команда | консилиум (ручная фиксация + Perplexity research) |
| Файл | `docs/seanses/desktop-logging-policy-2026-06-26.md` |
| Порядок ролей | Teamlead → Структурщик → Математик → Музыкант → Верстальщик (циклически) |
| Связанные документы | [`DESKTOP_APP_LOGGING_POLICY.md`](../DESKTOP_APP_LOGGING_POLICY.md) (черновик v0.1), [`DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md`](../prompts/DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md), [`STUDIO_HOST_LESSONS.md`](../device-board-scripts/STUDIO_HOST_LESSONS.md) ST8 |

**Вопрос консилиума:**

Перед спринтом `db3h-s5-desktop-logging`: какая **политика логов и support-feedback** для настольных **Membrana Studio** и **Membrana Device**? Где лежат файлы у установленного пользователя, формат, ротация, privacy, in-app export vs скрипты — с опорой на отраслевые практики Electron.

**Контекст (факты):**

- Studio shipped; trace device-board **только** console + in-memory buffer (10k) + Download trace; **нет** auto-persist.
- `%APPDATA%/Membrana/logs/app-*.log` — legacy прототип, не текущий main.
- Черновик политики v0.1 и `yarn desktop:support-collect` уже в репо — **до LGTM консилиума спринт не стартуем как закрытый**.
- Smoke run `092a986c`: operator PASS; парсер `yarn logs:parse` — инструмент разработки.
- Perplexity (Electron best practices): main = authoritative file logger; `userData/logs`; rotation; electron-log; in-app diagnostics + manual export; redaction; Sentry optional.

---

# Консилиум: политика логов Studio + Device

**Повестка:** (1) Два канала логов — main vs scenario trace; (2) пути и имена; (3) UX feedback; (4) privacy; (5) фазы спринта S5.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

---

[Teamlead]: Открываю с продуктового угла. Пользователь ставит `.exe` и при баге не должен гадать между `app-2026-04-16.log`, journal и DevTools. Спринт S5 **откладываем как «закрытый»** до этого консилиума — черновик v0.1 полезен, но не канон. Цель: **два понятных артефакта** для support: (A) **scenario trace** — цепочка device-board для smoke; (B) **shell log** — main + IPC, crash, FS. Оба под `%APPDATA%/Membrana/logs/`, но разные имена. In-app «Отправить диагностику» — фаза 2, не блокер v0.1.0.

[Структурщик]: Согласен с разделением. Архитектурно: **запись на диск только из main** (`apps/membrana-studio/src/main.ts`), renderer шлёт через preload — как media-library и journal. `electron-log` или тонкая обёртка над `fs` + rotation; **не** тянуть winston в renderer. Scenario trace: либо IPC `append-trace-line` в main (ring buffer в main), либо flush при Stop Run — но буфер сейчас в client, перенос в main — отдельный PR. Device (`membrana-device`) наследует **тот же** `userData` и те же имена файлов.

[Математик]: Для support важна **измеримость**: в manifest фиксировать `runId`, gate count, версию shell. `yarn logs:parse` остаётся **внутренним** алгоритмом — пользователю отдаём human summary или ticket ID. Ротация: max 5 файлов × 5 MB на shell log; trace — один `device-board-trace-latest.txt` + опционально `device-board-trace-<runId>.txt` при export. Метрика зрелости S5: % support-тикетов с приложенным T1.

[Музыкант]: Scenario trace — наш **аудио-pipeline** журнал: gate, upload, mic-fallback. Shell log — «приложение упало / IPC failed». Для Studio оба нужны: run `3ebe7b13` лечился по T1, не по app.log. ST8 (DevTools `…`) — аргумент за **auto-flush trace** или Download trace, не paste. Main log не заменяет T1.

[Верстальщик]: UX уровня A: Help → «Показать папку логов» (`shell.openPath`) + «Скачать trace сценария» (уже есть ↓ на device-board). Уровень B: «Отправить диагностику» — одна кнопка, preview списка файлов, consent checkbox. Copy по [`DESIGN.md`](../DESIGN.md): короткие русские строки, без жаргона `runId` в UI — только в экспорте. Device — тот же паттерн, меньше пунктов меню.

[Teamlead]: Perplexity подтверждает: industry default — `userData/logs`, main authoritative, rotation, dual path in-app + manual. Мы **не** внедряем Sentry в S5 v1 — только локальные файлы + optional upload endpoint backlog.

[Структурщик]: Канон путей (Windows; macOS/Linux — те же относительные):

```
Membrana/logs/
  shell-YYYY-MM-DD.log          # M1 — electron-log, main+renderer via IPC
  device-board-trace-latest.txt # T1 — scenario (flush или manual)
  support-manifest.json         # последний collect (опционально)
```

Удалить из документации обещание `app-*.log`. `journal/` и `media-library/` — **D1/D2**, не в zip по умолчанию.

[Математик]: Redaction policy: не логировать pairing token, `Authorization`, полный microphone device label если PII. Regex-scrub в main logger before write. `items.json` в support bundle — **opt-in** checkbox «Приложить журнал (метаданные)».

[Музыкант]: Уровень C (`yarn desktop:support-collect`) — для support с клоном репо, не для полевого оператора. Уровень A — default для пользователя. Скрипт собирает manifest + T1 + shell tail — OK.

[Верстальщик]: Перед Run — INFO checkbox уже есть; добавить tooltip «Логи сценария попадут в экспорт trace». About box: версия Studio, путь `userData` одной строкой для копирования.

[Teamlead]: Спор: auto-persist trace на каждый Stop vs только Download? Предлагаю **обязательный auto-flush T1** при `scenario-run-stop` и при crash renderer — в S5 phase DL-IMPL. До этого — уровень A manual остаётся каноном.

[Структурщик]: Принимаю. DL-IMPL: `membrana:logging` IPC — `appendScenarioTraceLine`, `flushTraceToDisk`. Чистая логика flush — в `packages/core` или `apps/client` утилита, запись — main. Не дублировать parser в Electron.

[Математик]: `yarn logs:parse` читает T1 без изменений формата строк. Shell log — отдельный grep, не смешивать в parser. Два инструмента: `logs:parse` (T1), `logs:parse-shell` (backlog).

[Музыкант]: Формат T1 оставляем `[INFO] [device-board][stage] event {runId, tick, …}` — уже эталон smoke. Shell: ISO timestamp + level + process + message — Perplexity example.

[Верстальщик]: Device v1 без media-library — support zip меньше; те же два файла T1+M1. Shared `userData` — в тикете спрашивать «Studio или Device».

[Teamlead]: Device app ещё нет — S5 пишет политику **на оба**, реализация DL-IMPL сначала Studio, Device копирует shell при scaffold.

[Структурщик]: MS6 host contract — добавить §Logging: backends × product. Запрет: business-log в `main.ts` кроме logging IPC.

[Математик]: Retention: shell 30 дней или 5 files; T1 latest перезаписывается; архив `trace-<runId>.txt` по желанию пользователя при export.

[Музыкант]: При crash после gate — T1 на диске важнее shell; flush на `recording-window-full` optional backlog.

[Верстальщик]: Error dialog при crash: «Сохранена диагностика в …» + кнопка «Открыть папку» — backlog DL-UX.

[Teamlead]: Риск: пользователь шлёт 500 MB media-library. Политика: default bundle **без** D2; явное предупреждение если opt-in.

[Структурщик]: `desktop:support-collect` обновить под M1+T1; exit 1 если оба отсутствуют — OK.

[Математик]: Acceptance S5: документ v1.0 LGTM + DL-IMPL spike issue (electron-log POC) + runbook RU без противоречий.

[Музыкант]: Принимаю. ST8 закрывается auto-flush, не просим DevTools у полевых пользователей.

[Верстальщик]: Принимаю. Три строки в Help достаточно для v1.

[Teamlead]: Финал — все пять ролей **принимают** таблицу ниже. Черновик `DESKTOP_APP_LOGGING_POLICY.md` revise до v1.0. Спринт S5 **перезапускаем** с фазами DL-0 (политика) → DL-IMPL (shell+flush) → DL-UX (опционально).

---

## Итоговое решение консилиума

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Сколько каналов логов? | **Два:** T1 scenario trace (device-board smoke) + M1 shell log (main authoritative) |
| 2 | Где на диске? | `%APPDATA%/Membrana/logs/` (общий `userData` для Studio и Device) |
| 3 | Имена файлов | `device-board-trace-latest.txt` (T1); `shell-YYYY-MM-DD.log` (M1); **не** `app-*.log` |
| 4 | Кто пишет на диск? | **Только Electron main**; renderer → IPC (как journal/media) |
| 5 | Библиотека shell | **electron-log** (или эквивалент) с rotation 5×5 MB — spike в S5 |
| 6 | Auto-persist T1 | **Да**, при stop/crash (DL-IMPL); до реализации — manual Download trace (уровень A) |
| 7 | Пользователь без репо | Уровень A: папка логов + trace file; уровень B: support-guided collect; **не** требовать `yarn` |
| 8 | `yarn logs:parse` | Остаётся **инструмент разработки** на T1; shell — отдельно (backlog) |
| 9 | Support bundle | T1 + M1 + manifest; **без** media-library по умолчанию; journal opt-in |
| 10 | Privacy | Redact tokens; preview/consent перед отправкой; in-app send — фаза 2 |
| 11 | Sentry | **Out of scope** S5 v1 |
| 12 | Device | Та же политика путей; реализация после Studio shell |
| 13 | Спринт S5 | **Не закрыт** до policy v1.0 + план DL-IMPL; консилиум — предшественник |

| **LGTM** | Teamlead, 2026-06-26 — принята таблица решений; policy v1.0 + DL-DOC в спринте S5 |

### Definition of Done (после консилиума, для S5)

- [x] `DESKTOP_APP_LOGGING_POLICY.md` **v1.0** — отражает таблицу выше
- [x] DL-DOC — матрица §10 (README apps + контуры docs)
- [x] `STUDIO_HOST_BRIDGE_CONTRACT.md` — §7.5 Logging
- [ ] `desktop:support-collect` — собирает T1 + M1 (когда M1 появится)
- [ ] Spike PR: electron-log в main + IPC stub
- [ ] DL-IMPL PR: flush T1 на scenario stop
- [x] Support runbook RU синхронизирован

### Отраслевые практики (Perplexity, кратко)

| Практика | Наше соответствие |
|----------|-------------------|
| Main = authoritative file logger | Принято → M1 via IPC |
| `userData/logs` | Принято → `Membrana/logs/` |
| Rotation + retention | M1: 5×5 MB; T1: latest overwrite |
| Structured + human-readable | T1 text+context; M1 timestamp+level |
| In-app diagnostics + manual export | Фаза 2 + уровень A сейчас |
| Redaction before send | Принято в политике |
| electron-log / Sentry | electron-log да; Sentry отложен |

Источники: [Electron process model](https://electronjs.org/docs/latest/tutorial/process-model), [Electron architecture logging practices](https://www.oflight.co.jp/en/columns/electron-app-architecture-best-practices).

---

## Следующий шаг

1. Teamlead LGTM → переписать [`DESKTOP_APP_LOGGING_POLICY.md`](../DESKTOP_APP_LOGGING_POLICY.md) v1.0 по таблице.
2. Разбить S5 на подфазы: **DL-0 docs** (сейчас) → **DL-1 shell log** → **DL-2 trace flush** → **DL-3 in-app UX** (optional).
3. **DB3H-S4** (детекторы) — после DL-0 docs LGTM, параллельно DL-1 если ресурсы есть.
