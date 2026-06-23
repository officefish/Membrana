# Day sprint: Membrana Studio MS0–MS4 (canon → installer)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) · [`MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`](./MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md)  
> **Реестр:** `id` = **`membrana-studio-ms0-ms4-day-sprint`** · `sprintKind` = **`day-sprint`**  
> **Родительский эпик:** `membrana-studio-desktop`  
> **GitHub Issue:** [#93](https://github.com/officefish/Membrana/issues/93)  
> **Стратегическая волна:** **W3** (полевой клиент + desktop SKU)  
> **Статус:** **active** · старт **2026-06-23**  
> **Размер:** **L** (5 фаз · 4–5 PR или verify+archive)

---

## Контекст

**Цель спринта:** довести **MS0–MS4** до LGTM и архивации фаз — настольная оболочка Studio с FS-хранилищем и Windows installer.

**Ограничение постановщика:** **не менять `apps/client`** в этом спринте. Renderer уже подключён (`electronAPI`, `resolveMediaLibraryBackend`, `resolveJournalBackend`, `userTemplatesPersistence`). Работа — в `apps/membrana-studio`, `scripts/studio-*.mjs`, `docs/`, CI `desktop-studio.yml`.

**Текущее состояние кода (intake 2026-06-23):**

| Фаза | Код | Тесты | Статус спринта |
|------|-----|-------|----------------|
| MS0 | `MEMBRANE_PLATFORM.md`, README Studio | — | **verify** docs |
| MS1 | `main.ts`, `preload.ts`, `yarn studio:dev` | typecheck | **verify** dev smoke |
| MS2 | `media-library-fs` + IPC | 3 tests ✓ | **verify** FS roundtrip |
| MS3 | `journal-fs`, `trends-templates-fs` | 4 tests ✓ | **verify** FS roundtrip |
| MS4 | `electron-builder`, `yarn studio:package`, `desktop-studio.yml` | CI | **verify** package + workflow |

**MS5 (prod paired smoke)** — **вне scope** этого day-sprint; отдельная фаза после LGTM MS0–MS4.

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-MS-SPRINT** | Day-sprint MS0–MS4; MS5 — follow-up |
| **D-MS-NO-CLIENT** | `apps/client` frozen; блокер в client → Issue + Vesnin, не silent fix |
| **D-MS-RENDERER** | Один renderer `apps/client` для web и Studio; Device — отдельный эпик |
| **D-MS-BRANCH** | Shell/FS/installer → `membrana-studio` или feature-ветка; `@membrana/core` только через `vesnin` |

---

## Распределение по ролям (виртуальная команда)

Формат: **Lead** = ответственный за merge PR фазы; **Support** = ревью / узкая экспертиза.

| Фаза | Task id | Vesnin (Teamlead) | Ozhegov (Структурщик) | Dynin (Математик) | Музыкант | Rodchenko (Верстальщик) |
|------|---------|-------------------|------------------------|-------------------|----------|-------------------------|
| **MS0** | `membrana-studio-ms0-canon` | **Lead:** канон Studio vs Device, LGTM docs | Support: пути FS в `MEDIA_LIBRARY_ARCHITECTURE` | — | — | Support: брендинг/термины в README |
| **MS1** | `membrana-studio-ms1-shell` | LGTM границ main/preload/renderer | **Lead:** Electron shell, IPC контракт, `studio:dev` | — | Support: mic permission handler в main | Support: title bar «Membrana Studio», min window |
| **MS2** | `membrana-studio-ms2-media-fs` | LGTM quota policy (paired vs local) | **Lead:** `%APPDATA%/Membrana/media-library/`, manifest+blobs IPC | **Lead:** soft disk quota, reserved collections | — | Verify: `StorageRuntimeIndicator` → «Electron FS» (read-only client) |
| **MS3** | `membrana-studio-ms3-journal-fs` | LGTM paired vs local journal | **Lead:** journal FS + trends IPC, stub replacement | — | Support: journal parity checklist (paired) | — |
| **MS4** | `membrana-studio-ms4-installer` | Release gate, CI policy | Support: `studio:build` pipeline, `client-dist` | — | Support: mic OS permission в installer runbook stub | **Lead:** NSIS, icon, `yarn studio:package`, installer UX |

### Порядок работы ролей (эвристика координатора)

1. **MS0** — Vesnin публикует канон → Ozhegov сверяет пути → Rodchenko вычитывает README.
2. **MS1** — Ozhegov shell → Rodchenko window chrome → Vesnin LGTM → Музыкант проверяет `setPermissionRequestHandler`.
3. **MS2–MS3** — Ozhegov FS+IPC → Dynin (MS2) квоты → unit-тесты → Vesnin LGTM.
4. **MS4** — Rodchenko installer → Ozhegov build script → CI green → Vesnin LGTM.

**Запрещено (все фазы):** импорт `@membrana/agenda`/плагинов/React в main/preload; второй `AudioContext` в shell; бизнес-логика детекторов в main.

---

## Архитектура (слой → путь)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Shell main | `apps/membrana-studio/src/main.ts` | Окно, permissions, FS stores, IPC register |
| Preload | `apps/membrana-studio/src/preload.ts` | `window.electronAPI` bridge |
| Media FS | `apps/membrana-studio/src/media-library/*` | Manifest + blobs на диске |
| Journal FS | `apps/membrana-studio/src/journal/*` | `items.json`, IPC |
| Trends FS | `apps/membrana-studio/src/trends/*` | `trends-templates.json` |
| Dev orchestration | `scripts/studio-dev.mjs`, `studio-package.mjs` | Vite + Electron / NSIS |
| Renderer | `apps/client` (**frozen**) | UI, services, backends resolve |
| CI | `.github/workflows/desktop-studio.yml` | Условная сборка installer |

---

## Фазы day-sprint

| Phase | Task id | Статус | Deliverable |
|-------|---------|--------|-------------|
| **MS0** | `membrana-studio-ms0-canon` | **verify** | Studio vs Device в `MEMBRANE_PLATFORM`; README; OPEN brief |
| **MS1** | `membrana-studio-ms1-shell` | **verify** | `yarn studio:dev` → client в Electron |
| **MS2** | `membrana-studio-ms2-media-fs` | **verify** | media-library на диске; 3 unit tests |
| **MS3** | `membrana-studio-ms3-journal-fs` | **verify** | journal + trends на диске; 4 unit tests |
| **MS4** | `membrana-studio-ms4-installer` | **verify** | `yarn studio:package` + `desktop-studio.yml` |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор Membrana (**Vesnin**). Day-sprint **`membrana-studio-ms0-ms4-day-sprint`**. Issue **#93**. Порядок: **MS0 → MS1 → MS2 → MS3 → MS4**. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

### Жёсткое ограничение

**Не редактировать `apps/client`** без явного LGTM Vesnin и записи в Issue. Если интеграция ломается — сначала чини shell/preload/IPC.

### Что сделать по фазам

**MS0** — сверить `docs/MEMBRANE_PLATFORM.md` §линейка, `apps/membrana-studio/README.md`, `MEDIA_LIBRARY_ARCHITECTURE.md` (electron-fs пути). DoD: новый разработчик понимает Studio vs Device vs Web за 5 мин.

**MS1** — `yarn studio:dev`: Vite 5173 + Electron, `contextIsolation`, preload → `electronAPI`. Prod path: `client-dist/index.html`. DoD: окно открывается, title «Membrana Studio».

**MS2** — FS port media-library (`manifest.json`, `blobs/`). IPC Blob↔ArrayBuffer. DoD: `yarn workspace @membrana/membrana-studio test` green; в Studio UI indicator «Electron FS».

**MS3** — journal FS + trends templates. DoD: запись трека создаёт файлы в `%APPDATA%/Membrana/`; unit tests green.

**MS4** — `electron-builder` NSIS, `yarn studio:package`, prod `VITE_CABINET_API_URL`. DoD: `.exe` в `release/`; CI workflow `desktop-studio.yml` документирован.

### Definition of Done (sprint MS0–MS4)

- [ ] MS0–MS4: DoD каждой фазы выполнен или gap зафиксирован в Issue #93
- [ ] `yarn workspace @membrana/membrana-studio typecheck test` — green
- [ ] `yarn studio:build` — green (локально или CI)
- [ ] `apps/client` **без коммитов** в sprint PR (или 0 строк — исключение только с LGTM)
- [ ] `yarn task:archive` для MS0…MS4 по мере LGTM
- [ ] Отчёт в Issue #93 · `docs/day-sprint/membrana-studio-ms0-ms4-2026-06-23/CLOSURE.md` при закрытии спринта
- [ ] **MS5 не начинать** в этом спринте

### Out of scope

- `apps/membrana-device`, MS5 prod smoke, auto-update, code signing
- macOS / Linux installer
- Правки `apps/client` (кроме LGTM-blocker)
- MP7/NR изменения

### Stop rules

- 2 CI fail подряд на одной фазе → handoff в Issue #93
- Потребность в client change → стоп, комментарий Vesnin, отдельный micro-task

---

## Заметки для постановщика

1. `yarn main-day-issue` — `primaryFocusId: membrana-studio-ms0-ms4-day-sprint`.
2. Ветка: `membrana-studio` или `feature/ms0-ms4-day-sprint`.
3. MS5 оставить active в реестре; закрыть после отдельного smoke-дня.
4. Open brief: [`docs/day-sprint/membrana-studio-ms0-ms4-2026-06-23/OPEN.md`](../day-sprint/membrana-studio-ms0-ms4-2026-06-23/OPEN.md).
