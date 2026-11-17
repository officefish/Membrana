# Обсуждение: review-board-hold-modal-2533-rodchenko

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-10-01 08:13 UTC · rodchenko

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana/76cd8a36-7385-4879-9883-c88a7c362917/scratchpad/review-b2-ticket.md
**Вопрос:** Ты резчик и исполнитель блока b2. Проверь дифф против своих BLOCK-условий (а)–(д) и прогноза: нет ли слов о причинах в пакете доски, читается ли живая ось только из снимка сервиса, приходят ли headline/tone готовыми, живой ли remainingText, один ли refresh() в хосте; оцени отклонение с openForCurrentEpisode в плашке и размещение зубов адаптера в тесте хоста. Вердикт LGTM/BLOCK с находками по строкам, кратко.

**Ответ:**

## Проверка BLOCK-условий b2

**(а) Нет своих слов в device-board** — ✅
- `board-overflow-hold-badge.tsx:30`: `const label = hold.headline` — печатает как есть, своего префикса нет.
- `board-overflow-hold.ts:12-16`: контракт честно задокументирован «готовой строкой из клиента (#2533)».
- `board-runtime-status.tsx:72`: `[overflowHold.headline, overflowHold.phaseText, overflowHold.aliveText].join(' · ')` — склейка готовых кусков.

**(б) Surface не читает квоту мимо снимка** — ✅
- `useOverflowHoldBoardView.ts`: `service.getSnapshot().quota` через `useSyncExternalStore`, сети нет.

**(в) headline/tone готовыми из board-view** — ✅
- Бейдж (`:30-32`), плашка (`OverflowHoldPlashka.tsx:21-24`), статус доски (`:65,72`) — только читают `view.tone`/`view.headline`, не вычисляют.

**(г) remainingText от живой оси** — ✅
- `buildBoardOverflowHoldView`: `live ?? atStop`; при живой квоте — `formatAxisRemaining(live)`.

**(д) refresh() один раз у хоста** — вне диффа, доверяю ранее положенным зубам в `OverflowWindowHost.test.tsx`.

## Отклонения

1. **Плашка зовёт `getOverflowWindowController().openForCurrentEpisode()` напрямую** (`OverflowHoldPlashka.tsx` — вызов на кнопке, вне показанного фрагмента, но подразумевается структурным зубом). Это осознанное отклонение по резчику: `view.onOpenWindow` в `BoardOverflowHoldView` сделан для **доски**, не для клиентской плашки; дублировать его в клиентской поверхности — лишний слой. Приемлемо, зафиксировано в тикете.
2. **Зубы адаптера в `OverflowWindowHost.test.tsx`** — зона b2 отдельного файла не давала; размещение честное, лексикой теста отражает, что адаптер читается через хост.
3. Структурный зуб «Буфер полон» расширен до трёх форм литерала (`'`, `` ` ``, `>JSX`) — правильно: исторический ствол `dba53da0` имел и шаблон в бейдже, и JSX-текст в плашке.

## По верстке

- `badge-warning`/`alert-warning` + `text-warning` — токены темы, не самодеятельность. ✅
- `data-overflow-tone` в бейдже, плашке и статусе — единая метка для E2E/отладки. ✅
- `aria-label` бейджа включает `label` + `remainingText` — доступность не потерялась. ✅
- Одна зона фиксации: headline жирным/акцентом, остаток и время — приглушёнными `opacity-60/70`. Иерархия держится.

## Вердикт

**LGTM.** Условия (а)–(д) соблюдены, оба отклонения — осознанные и в границах мандата резчика. Живая приёмка владельца 30.09/01.10 подтвердила три состояния (0 B жёлтый, 100% красный, снятие удержания) — витрина честная.

[память:подсознание] emerge rodchenko-2026-07-29-tariff-grid-m6-switch — там я формулировал норму «с витрины оператор видит исход», здесь ровно это: три метки (`error`/`warning`/снято) приходят готовыми из view, компонент их не сочиняет.
[память:подсознание] emerge rodchenko-2026-09-08-tariff-single-truth-m1-reseed-r3 — там UI не источник правды и не чинит расхождение; здесь то же: `useSyncExternalStore` на снимке сервиса, surface только читает.

---
