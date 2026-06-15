# Промпт (Night Build эпик): Cabinet MP4 hardening — DRY playback, facade, quality gate

> **Night Build эпик** — автономный ночной цикл по [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md).
> Размер: **L** (4 фазы NB0–NB3, 1–2 ночи).
> Реестр: `id` = `cabinet-mp4-hardening-night-build`.
> Основание: [`DAILY_CODE_REVIEW.md`](../DAILY_CODE_REVIEW.md) (2026-06-14), ветка `feat/membrane-platform-mp4`.

---

## Контекст

MP4 (квоты, cabinet sample library, media bridge) **функционально готов**, но code-review выявил **архитектурный и качественный долг** перед merge в `techies68` и перед CSL3 / real-dataset week:

- дублирование `sampleLibraryPlaybackHub` между `apps/client` и `apps/cabinet`;
- монолит `SampleLibraryPage.tsx` (~650 строк);
- lint/test WARNING; session cache без reset на logout;
- a11y/compact UI в inline waveform row.

Night Build **не** добавляет продуктовых фич — только hardening и DRY.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md) | Ритуал night:open / checkpoint / close |
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | Playback через audio-engine; HTTP к media |
| [`SERVICES.md`](../SERVICES.md) | Foundation vs analyzer; новый shared module |
| [`DESIGN.md`](../DESIGN.md) | Compact table, a11y |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | cabinet ↔ media границы |
| [`CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md`](./CABINET_SAMPLE_LIBRARY_V1_EPIC_PROMPT.md) | CSL1–CSL3 — **после** NB |

**GitHub Issue:** [#67](https://github.com/officefish/Membrana/issues/67) (комментарий night build; отдельный Issue опционально).

**Ветка Night Build:** `night/cabinet-mp4-hardening-2026-06-14` ← `techies68`.

---

## Подзадачи (строгий порядок, одна ночь = NB0→NB3)

| Фаза | Реестр `id` | Содержание | Lead | PR |
|------|-------------|------------|------|-----|
| **NB0** | `cabinet-mp4-nb0-merge-gate` | lint/test fix, audit графа cabinet↔services↔background | Vesnin + Ozhegov | 0 или 1 |
| **NB1** | `cabinet-mp4-nb1-sample-playback-dry` | Extract shared playback module; migrate client + cabinet | Ozhegov | 1 |
| **NB2** | `cabinet-mp4-nb2-cabinet-facade` | Hooks, split page, `resetCabinetMediaSession()` | Ozhegov + Rodchenko | 1 |
| **NB3** | `cabinet-mp4-nb3-quality-contracts` | LRU cache, a11y Escape, OpenAPI sketch bridge quota | Dynin + Rodchenko + Vesnin | 1 |

> **Stop rule:** 2 scoped CI fail подряд → commit WIP, `yarn night:close`, блокер в HANDOFF.

---

## Night Build — промпт целиком (для вставки агенту)

> Скопируй от строки «### Кто ты» до «### Stop rules» в начало ночного диалога.
> Перед стартом: `yarn night:open --id cabinet-mp4-hardening-night-build`.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** (Vesnin). Работаешь в режиме **Night Build** по [`NIGHT_SPRINT_REGULATION.md`](../NIGHT_SPRINT_REGULATION.md) и этому промпту. Scope **заморожен** (NB0–NB3). Prod-deploy и новые фичи **запрещены**.

---

### Контекст ночи

После MP4 cabinet sample library работает через:

- `@membrana/media-library-service` + HTTP `createServerStorageBackend` → `background-media`;
- `@membrana/audio-engine-service` (`BufferPlayer`) в `sampleLibraryPlaybackHub`;
- `background-cabinet` → `MediaBridgeService` для quota/catalog API.

Проблема: **два почти одинаковых hub** (`apps/client` и `apps/cabinet`), fat page, lint/test debt.

---

### NB0 — Merge gate (первая фаза, обязательна)

**Lead:** Vesnin. **Support:** Ozhegov.

1. Зафиксировать baseline: `git status`, ветка `night/cabinet-mp4-hardening-*`.
2. Исправить **`@membrana/client#lint`** (exit 1 из code-review).
3. Устранить WARNING в `@membrana/audio-engine-service#test` и `@membrana/fft-analyzer-service#test`.
4. Документировать граф (markdown в PR или `docs/discussions/`):

   | From | To | OK? |
   |------|-----|-----|
   | `apps/cabinet` | `@membrana/media-library-service` | ✅ |
   | `apps/cabinet` | `packages/background-media` (npm) | ❌ must be absent |
   | `background-cabinet` | `@membrana/tariff-dataset` (npm) | ❌ must be absent |

5. Checkpoint: `yarn turbo run lint typecheck test --continue --filter=@membrana/client --filter=@membrana/cabinet --filter=@membrana/audio-engine-service --filter=@membrana/fft-analyzer-service`

**DoD NB0:** scoped CI green; граф записан; `yarn night:checkpoint --phase NB0 --status pass`.

---

### NB1 — Shared sample playback (DRY)

**Lead:** Ozhegov. **Support:** Dynin (envelope tests), Музыкант (BufferPlayer lifecycle).

1. Создать foundation-модуль **`packages/services/sample-playback`** (`@membrana/sample-playback-service`):
   - `service.ts` — hub logic (BufferPlayer singleton policy, cache maps, envelope via pure fn);
   - `types.ts`, `index.ts`;
   - перенести тесты из `apps/client/src/lib/sampleLibraryPlaybackHub.test.ts`.
2. Зависимости: только `@membrana/core` + `@membrana/audio-engine-service` (см. [`SERVICES.md`](../SERVICES.md)).
3. Мигрировать **`apps/client`** → импорт из нового пакета; удалить дубликат файла.
4. Мигрировать **`apps/cabinet`** → тот же пакет; удалить дубликат.
5. Alias в `apps/client/vite.config.ts`, `apps/cabinet/vite.config.ts`, tsconfig paths, root `tsconfig.json`, `packages/services/README.md`.

**Запрещено:** React в `service.ts`; прямой Web Audio в apps.

**DoD NB1:** один hub; client+cabinet tests pass; checkpoint NB1 pass.

---

### NB2 — Cabinet facade + UI split

**Lead:** Ozhegov. **Support:** Rodchenko.

1. **`useCabinetSampleLibrary()`** — selection, `runMediaOp`, refresh, membrane/nodes state (вынести из page).
2. Разбить `SampleLibraryPage.tsx`:
   - `SampleLibrarySidebar.tsx`
   - `SampleLibraryToolbar.tsx`
   - `CabinetSampleCollectionBody.tsx` (уже есть — доработать props)
   - Page ≤ **200 строк**.
3. **`resetCabinetMediaSession()`** в `cabinetMediaLibrary.ts` — вызов на logout / switch membrane.
4. Rodchenko: compact inline waveform row height ≤ **48px**; DaisyUI tokens без hardcode.

**DoD NB2:** page ≤200 lines; logout clears media cache; checkpoint NB2 pass.

---

### NB3 — Quality + contracts

**Lead:** Rodchenko + Dynin. **Support:** Vesnin.

1. **Dynin:** LRU cap `bufferCache` / `waveformCache` (default N=20) — pure policy fn + unit tests.
2. **Rodchenko:** global **Escape** → `disposeSamplePlayback()` на `SampleLibraryPage`; verify `SampleWaveformScrubber` a11y.
3. **Vesnin:** черновик OpenAPI paths для `MediaBridgeService` quota/session в `packages/background-cabinet` (swagger comment или `docs/` ADR, без breaking API).
4. Optional: baseline Docker image size note in `docs/deploy/` (no prod deploy).

**DoD NB3:** cache tests; Escape works; ADR/OpenAPI sketch; checkpoint NB3 pass.

---

### Архитектура после NB (целевое состояние)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Playback hub | `packages/services/sample-playback` | BufferPlayer, waveform envelope, cache |
| Client UI | `apps/client` | Sample library module → shared hub |
| Cabinet UI | `apps/cabinet` | Thin page + hooks → shared hub |
| Media domain | `@membrana/media-library-service` | Storage backend, quota types |
| Identity | `background-cabinet` | Session, membrane, bridge to media |

**Запрещено:**

- `apps/cabinet` → `background-media` / Nest / Prisma
- `background-cabinet` → `@membrana/agenda`, `apps/client`
- Новый `AudioContext` вне `@membrana/audio-engine-service`
- Prod deploy из night branch

---

### Scoped CI (вся ночь)

```bash
yarn turbo run lint typecheck test build --continue \
  --filter=@membrana/sample-playback-service \
  --filter=@membrana/client \
  --filter=@membrana/cabinet \
  --filter=@membrana/audio-engine-service \
  --filter=@membrana/media-library-service
```

Финал ночи: `yarn night:close --id cabinet-mp4-hardening-night-build`.

---

### Stop rules

- 2 scoped CI fail подряд → stop, handoff блокер.
- Любое изменение `@membrana/core` / `@membrana/agenda` → stop, нужен `vesnin` + дневной LGTM.
- Scope creep (CSL3, prod, new API) → stop, вынести в отдельный day Issue.

---

### Out of scope (эпик)

- Prod deploy / SSH smoke
- CSL3 remote ops, real-dataset calibration week
- MembraneRegistry refactor (отдельная задача `apps/client` pairing lifecycle)
- Платежи, OAuth, multi-membrane

---

### Порядок ролей (ночь)

1. **Vesnin** — NB0 gate, NB3 ADR, утренний LGTM.
2. **Ozhegov** — NB1–NB2 интеграция, ревью импортов.
3. **Dynin** — NB0 tests, NB1 envelope tests, NB3 LRU.
4. **Музыкант** — NB1 BufferPlayer seek/stop sanity (ручная или unit).
5. **Rodchenko** — NB2 split UI, NB3 Escape/a11y/compact.

---

### Definition of Done (эпик)

- [ ] NB0–NB3 checkpoint pass или deferred в HANDOFF с причиной.
- [ ] Shared `@membrana/sample-playback-service`; нет дубликатов hub в apps.
- [ ] `SampleLibraryPage` ≤ 200 строк; `resetCabinetMediaSession` на logout.
- [ ] Scoped CI green (команда выше).
- [ ] `yarn night:close` → `docs/archive/night-build/<date>/HANDOFF.md`.
- [ ] **Утром:** LGTM Vesnin → PR `night/*` → `techies68` → `yarn task:archive cabinet-mp4-nb*`.

---

## Заметки для постановщика

1. Вечер: `yarn ritual:evening` → `yarn night:open --id cabinet-mp4-hardening-night-build`.
2. Агенту: блок **«Night Build — промпт целиком»** + ссылка на этот файл.
3. Утро: прочитать HANDOFF → `yarn ritual:day` → merge или `--continue`.
4. После merge: архивировать `cabinet-mp4-nb0-merge-gate` … `nb3` по одной с `--notes "Night build PR #…"`.

### Проверка после merge

```bash
yarn turbo run lint typecheck test build --continue
yarn task:list
```

---

## Связь с дорожной картой

- Разблокирует merge MP4 → `techies68` без архитектурного долга.
- Предшествует `cabinet-sample-library-csl3-remote-ops` и `real-dataset-live-calibration`.
- Не закрывает эпик #67 — только hardening-слой.
