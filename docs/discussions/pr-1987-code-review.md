<!-- Сгенерировано: 2026-08-20T11:22:10.237Z (yarn code-review; pr, pr-1987, llm-anthropic) -->

<!-- review-verdict sha:b4f768c0f398d313b70921d98196e86bb2da5511 base:551b71fc13bf59a2e0085f17e46b31b1c2bc116f verdict:LGTM lead:ozhegov at:2026-08-20T11:22:10.237Z -->

<!-- review-source
  source: gh-compare
  base_ref: main
  merge_base: 551b71fc13bf59a2e0085f17e46b31b1c2bc116f
  head_sha: b4f768c0f398d313b70921d98196e86bb2da5511
  head_match: false
  files: 18
  truncated: false
-->

Tier: T1

> PR #1987 — **MERGED** (факт из таблицы состояний). Ревью — для архива и закрытия задачи `contour-sanity-2026-08-19` блоков 5–6; вердикт post-factum.

---

**[Ozhegov — ведущий ревью, leadPersona карточки sanitation-2026-08-20]:**

Пропуск. Бестиарий проверен по диффу:

- **B1–B5, B7, B9–B10** — признаков в диффе нет.
- **B6 (молчаливый зелёный):** grep-зуб заменён ESLint-API зубом с двойной проверкой (чистый executor → 0 сообщений; грязный → 2 срабатывания с текстом нормы #1950). Зуб честный, B6 не применим.
- **B8 (немой носитель):** `@membrana/wav-decode` объявлен в `package.json` обоих потребителей, в `tsconfig.json` корня и в `vitest-smoke.catalog.json` — носитель назван везде, B8 не применим.

Граница пакетов: `packages/libs/wav-decode` → `plugin-handlers` → `background-media` — однонаправленная зависимость, циклов нет (C1). `no-restricted-imports` в `.eslintrc.cjs` накрывает только файлы executor/port/preset/стабы — C4 соблюдён. `wav.ts` стал тонким реэкспортом — слабая связанность улучшена.

---

**[Teamlead — Vesnin]:**

PR size: **oversized** (~439 строк, цель ≤400) — **P2**, не блокер; объём оправдан объединением двух блоков спринта (5+6) с новым пакетом `wav-decode` под один scope #1972. Рекомендую при следующем подобном разделять блок создания пакета и блок рефакторинга потребителей в отдельные PR.

Границы соблюдены: новый пакет в `packages/libs/`, нет циклических зависимостей, нет прямых импортов из `background-*` внутри `plugin-handlers`. `nodeId = s.id` — корректное исправление семантики (имя источника кадра, не `null`). CJS-сборка `wav-decode` обоснована в README — `background-media` CJS Node 20, ESM-потребители подхватывают без потерь. Проверка C8: `console.log` в диффе отсутствует. C9: секреты и deploy-логи в диффе отсутствуют.

Единственный нюанс P2 (opportunity): `wav-read.mjs` грузит dist по хардкодированному пути через `pathToFileURL`; при переезде пакета путь молча сломается. Opportunity: вынести путь в константу с проверкой `existsSync` или добавить зуб, аналогичный grep-зубу, — не блокирует, фиксировать в follow-up.

Утренние команды (для архива): `yarn turbo run typecheck test --filter=@membrana/wav-decode --filter=@membrana/plugin-handlers --filter=@membrana/background-media`.

---

**[Структурщик — Ozhegov]:**

C1 пройден: `wav-decode` → `plugin-handlers` и `wav-decode` → `background-media` — fan-in 2, нет обратных импортов. C4: executor изолирован `.eslintrc.cjs`, зуб проверяет и чистый, и грязный случай — норма #1950 машинно держится формой. Тесты рядом с кодом (C7): `src/index.test.ts` + `executor.test.ts` обновлён — покрыты моно/стерео/отказы/Buffer + grep-зуб на отсутствие копий RIFF-разбора у трёх потребителей.

---

**[Математик — Dynin]:**

C6: нормировка `/ 32768` (не `/ 32767`) — стандартная практика для PCM16, даёт `[-1, 1)` без симметрии снизу; тест явно фиксирует `[0.5, -1, 0]` — ожидание совпадает с реализацией, граничный случай `-32768` зафиксирован. `Math.floor(data.size / 2 / channels)` — корректный подсчёт кадров с усечением хвостового неполного кадра; off-by-one не возникает. `size: Math.min(size, bytes.byteLength - start)` — защита от кривого заголовка с завышенным size: корректно.

---

**[Музыкант — Kuryokhin]:**

C2: Web Audio в диффе отсутствует — не применимо. Замечу: декодер работает с PCM16 при фиксированном 48 kHz в `background-media`; `wav-decode` сам `sampleRate` не проверяет (читает из заголовка и отдаёт). Для записей Firebat это ок — узел пишет 48 kHz; edge-случай другой частоты будет виден потребителю в поле `sampleRate`.

---

**[Верстальщик — Rodchenko]:**

UI в диффе отсутствует. C5 — не применимо.

---

**Итоговый артефакт:** `docs/discussions/pr-1987-code-review.md`

**Definition of Done:** `yarn turbo run typecheck test --filter=@membrana/wav-decode --filter=@membrana/plugin-handlers --filter=@membrana/background-media` — зелёный (PR уже MERGED, команда — для проверки чистоты main после влития).

**Риски:**
- P2: хардкодированный путь до dist в `wav-read.mjs` — opportunity, follow-up issue.
- P2: PR oversized на 39 строк — наблюдение, не блокер.

**Вердикт: LGTM** (post-factum; блокеров не обнаружено, бестиарий чист, acceptance criteria блоков 5–6 спринта `contour-sanity-2026-08-19` выполнены).