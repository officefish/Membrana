<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-12
  archived-at: 2026-06-12T20:31:20.111Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-12T06:10:00.000Z (утренний ритуал; ручной main-day-issue — yarn main-day-issue недоступен: Anthropic API) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry -->
<!-- active в реестре: background-media-a5a-server -->

# MAIN_DAY_ISSUE — 2026-06-12

**Дата:** 2026-06-12 (утро)
**Роль:** Teamlead (Vesnin)
**Статус:** A5a сервер готов; клиентский remote storage — блокер для web data-plane

---

## 🎯 Один обязательный фокус дня

### **A5a (клиент): `ServerStorageBackend` + device registry для `background-media`**

**GitHub:** [#58](https://github.com/officefish/Membrana/issues/58) (background-media v1)
**Реестр:** `background-media-a5a-server`
**Промпт:** `docs/prompts/BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md` (пункты 6–8)

**Критерий успеха дня:** при `yarn media:db:up && yarn media:migrate && yarn media:dev` клиент в режиме remote-server загружает и отображает хотя бы один сэмпл; trends user template сохраняется/читается через media API с `deviceId`.

---

## 📋 Сущность дня

Сервер `@membrana/background-media` уже на `techies68` (`4147361`). Без клиентского `IStorageBackend` web-клиент остаётся на IndexedDB — **эшелон «свой сервер» не замкнут**.

**Три блока работы:**

1. **`ServerStorageBackend`** — HTTP-клиент к `/v1/devices/:deviceId/collections/.../samples` (multipart upload, list, delete, download).
2. **`mediaDeviceRegistry`** — стабильный `deviceId`, заголовок `X-Membrana-Device-Id`, опционально регистрация device на сервере.
3. **Шаблоны trends** — `userTemplatesPersistence` на device-scoped URL media API (не office).

**Вне скоупа:** полный A5b compose всего стека, A5c deploy, новые FFT-фичи (sample-analyzer уже в `bc0dfef`).

---

## 📋 Definition of Done

- [ ] `packages/services/media-library/src/backends/server-storage.ts` реализует `IStorageBackend`.
- [ ] `apps/client/src/lib/mediaDeviceRegistry.ts` — create/load `deviceId`, экспорт для storage и templates.
- [ ] Клиент: выбор backend (local vs remote) через env или настройку sample library.
- [ ] `userTemplatesPersistence.ts` использует base URL media-server и `deviceId`.
- [ ] Smoke: upload WAV/MP3 → list → playback в Sample Library UI.
- [ ] Unit-тесты для server-storage (mock fetch) или integration test в vitest.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/media-library-service --filter=@membrana/client` — green.
- [ ] PR только client + media-library + background-media deploy fixes.

---

## 📎 Контекст из вчерашнего review

- Вечерний review: `docs/DAILY_CODE_REVIEW.md` (2026-06-11).
- Sample-analyzer и Zustand templates **закоммичены** (`bc0dfef`) — не дублировать работу.
- Локальный smoke media: README `packages/background-media/`, порт **3010**, token `X-Membrana-Token`.

---

## 🔗 Ссылки

- [`docs/BACKGROUND_SERVERS.md`](./BACKGROUND_SERVERS.md)
- [`docs/MEDIA_LIBRARY_ARCHITECTURE.md`](./MEDIA_LIBRARY_ARCHITECTURE.md) §4.2
- [`packages/background-media/README.md`](../packages/background-media/README.md)

---

**Следующий шаг после DoD:** task archive `background-media-a5a-server` (частично) → A5b Docker Compose full stack.
