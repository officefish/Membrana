<!-- Сгенерировано: 2026-10-07T17:58:59.125Z (yarn code-review; daily, llm-anthropic) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: 0632587269744d28767dc33154853309dc73210b^..c5d2afe19cd60f226f1c9961c605e21f067b3245 (10 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 06325872 #2616 (989), 9740547e #2620 (421), 758ca82a #2618 (804), d75f76cd #2617 (498), c024a216 (659)

---

Tier: T2

---

**[Vesnin (Архитектор — ведущий ревью)]:**

Пропуск/блок по бестиарию: **пропуск** (антипаттернов B1–B10 в раскрытых диффах не обнаружено). День значимый: прод-порча 07.10 поймана, воспроизведена тестом и закрыта в тот же день (#2627) — это образцовый цикл «порча → минимальный репро → фикс → ADR-обновление». Контракт `selectKeepWithinBytes` сменил инвариант (неизмеримые в хвост keep, не в freeze); ADR-0031 §6 обновлён словом владельца, исходная посылка консилиума 05.10 отозвана явно — хорошая гигиена. Новые коды отказа (`measure_nothing_decodable`, `measure_floor_not_measured`) замкнуты типом `MeasureRefusalReason` через exhaust-mapped record `MEASURE_REFUSAL_TO_DOOR` — новая причина измерителя покраснит tsc, не замолчит. Граница `background-media` / `apps/cabinet` соблюдена: клиентский `downgradeArchive.ts` ходит только через HTTP, не через package-импорт. Oversized: 4 из 10 коммитов не развёрнуты (#2616 989, #2618 804, #2617 498, #2620 421) — ревьюить отдельными PR; оставшийся раскрытый материал достаточен для вердикта по дню.

---

**[Tarasov (Teamlead)]:**

PR size дня: 5 oversized из 10 коммитов — системный паттерн P1 «recommend split», не разовый; фиксировать в follow-up, не блокировать закрытые PR. C8: в раскрытых диффах `console.log` не найден. C9: секреты и deploy-логи в коммите не обнаружены; `cve-triage-2026-10-07.md` содержит только ссылки и анализ, не токены. C10: каталог и docs-sync не затронуты в видимых диффах, `LIVE_SERVICES.md` не обновлялся в сегодняшнем диффе — при merge #2616 (оркестратор + порт дверей архива media) стоит проверить, отражён ли новый edge в инвентаре служб. Риски на завтра: (1) два `@fastify/busboy` advisory — `runtime-exposed` в `background-media`, lockfile-фикс через `resolutions` не выполнен (P1, требует `yarn install` + тест media); (2) #2616/#2618/#2620 — oversized, диффы не раскрыты, C1/C3/C4 не верифицированы. Команды утром:

```bash
# Верификация фикса неизмеримых
yarn turbo run test --filter=@membrana/plugin-handlers
yarn turbo run test --filter=@membrana/background-media

# typecheck затронутых пакетов
yarn turbo run typecheck --filter=@membrana/plugin-handlers
yarn turbo run typecheck --filter=@membrana/background-media
yarn turbo run typecheck --filter=@membrana/cabinet

# CVE P1: busboy — добавить root resolutions @fastify/busboy -> 3.2.1, затем:
yarn install
yarn workspace @membrana/background-media test

# Проверка покрытия triage (новый скрипт #2625)
node scripts/lib/deps-watch-security-triage-coverage.test.mjs
```

---

**[Ozhegov (Структурщик)]:**

C1: в раскрытом диффе #2621 `apps/cabinet/src/api/downgradeArchive.ts` — только HTTP-клиент через `authFetch`, прямых package-импортов из `background-media` нет; граница соблюдена. C4: `useDowngradeArchive` — хук тонкий (только `useState` + `useCallback` + `useEffect`, I/O делегировано `fetchArchiveBatches`), бизнес-логика в хук не затекла. C3: MembranaRegistry в диффе не фигурирует — применимо. C7: тесты рядом с кодом — `NodeDowngradeArchivePanel.test.tsx` и `DowngradeConfirmDialog.test.tsx` обновлены синхронно с компонентами, `select-keep-unmeasured-buffer.test.ts` — новый интеграционный файл, воспроизводящий прод-порчу; `select-keep-within-bytes.test.ts` обновлён под новый контракт. Одно наблюдение (P2, opportunity): в `useDowngradeArchive` ошибка `fetchArchiveBatches` глотается в `catch` с `setNodes([])` без какого-либо лога — при отладке нет следа; добавить хотя бы `console.error` в dev-режиме или выставить состояние `error` наружу — отдельным билетом.

---

**[Dynin (Математик)]:**

C6: `selectKeepWithinBytes` после правки — корректный priority-greedy обход: неизмеримые уже стоят в хвосте через компаратор, `eligible`-гард удалён, инвариант `sum(keep.bytes) ≤ limitBytes` сохранён (проверка `keepBytes + c.bytes <= limitBytes` универсальна). Граничный случай: pinned-неизмеримая по-прежнему идёт первой — контракт явно оговорён комментарием и тестом `:150`. Тест `select-keep-unmeasured-buffer.test.ts` воспроизводит прод-форму (PCM16 WAV 48 кГц 5 с, детерминированный «шум» без `Math.random`) — фикстура честная, не случайная. Проверка закрытости словаря отказов через mapped record `MEASURE_REFUSAL_TO_DOOR: Readonly<Record<MeasureRefusalReason, ...>>` — правильный паттерн: добавление новой ветви в `MeasureRefusalReason` без правки map красит tsc. C6-риск `spectral-variety < K` при малом буфере (из вчерашнего ревью) — не закрыт в видимом диффе, переходящий P2.

---

**[Kuryokhin (Музыкант)]:**

C2: Web Audio в диффе не фигурирует. Аудио-путь (`audio-engine`, `packages/services`) сегодня не затронут — применимо. Косвенное наблюдение по `select-keep-unmeasured-buffer.test.ts`: синтетический WAV строится без `Math.random` (детерминированный LCG-шум через `(i * 2654435761) >>> 0`), что корректно для воспроизводимого теста; 48 кГц моно — соответствует формату прибора `scenarioMicJournalBridge`. Флаг `COLD_ARCHIVE_SWEEP_ENABLED` + `dryRun:true` по умолчанию (#2603, из вчерашнего) — P2-долг по документированию в `.env.example` не закрыт в сегодняшнем диффе; переходящий.

---

**[Rodchenko (Верстальщик)]:**

C5: `NodeDowngradeArchivePanel.tsx` — a11y-скелет корректный: `<section aria-labelledby>`, `aria-busy` на нажатой кнопке, `disabled` на всех пока `busyId !== null`, `aria-label` с датой партии, `role="status"` / `role="alert"` разведены, фокус переводится на `feedbackRef` с `tabIndex={-1}` после исчезновения кнопки. Обсуждение Rodchenko 07.10 (docs/discussions/2619) зафиксировало и закрыло P1 — `text-warning` заменён на `alert alert-warning` до merge. `ChartListSettings.tsx` (#2624): маркер «Настройки изменены, выборка не пересчитана» — `role="status"`, подпись выборки включает критерий и объём — честное состояние для пользователя. Молчание панели при провале загрузки всего архива принято как осознанный трейд-офф (долг в обсуждении), не баг верстки.

---

**Итоговый артефакт:** `docs/DAILY_CODE_REVIEW.md`

**Definition of Done (утро):**
```bash
yarn turbo run test --filter=@membrana/plugin-handlers
yarn turbo run test --filter=@membrana/background-media
yarn turbo run typecheck --filter=@membrana/plugin-handlers
yarn turbo run typecheck --filter=@membrana/background-media
yarn turbo run typecheck --filter=@membrana/cabinet
# После добавления resolutions в root package.json:
yarn install
yarn workspace @membrana/background-media test
# Покрытие triage
node scripts/lib/deps-watch-security-triage-coverage.test.mjs
```

**Риски:**
- **P1** — `@fastify/busboy` (GHSA-xjh9-v7x6-24jw, GHSA-x8mw-p69m-v3mx): runtime-exposed в `background-media`; lockfile не обновлён; добавить `resolutions` + `yarn install` до следующего деплоя media.
- **P1** — #2616/#2618/#2620 oversized (989/804/421 строк): C1/C3/C4 не верифицированы; ревьюить как отдельные PR утром перед merge в следующий спринт-шаг.
- **P2** — `useDowngradeArchive`: ошибка загрузки глотается без следа; opportunity для `console.error` в dev или внешнего `error`-состояния.
- **P2** — `COLD_ARCHIVE_SWEEP_ENABLED` + `dryRun:true` по умолчанию: риск «включил флаг, забыл выключить dryRun»; документировать в `.env.example` отдельным билетом.
- **P2** (переходящий) — `spectral-variety < K` при малом буфере: edge-case не закрыт тестом.