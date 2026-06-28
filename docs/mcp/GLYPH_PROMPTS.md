# Glyph — готовые промпты под Membrana (Tier 5… фактически Tier 3)

> Сервер: [`benmyles/glyph`](https://github.com/benmyles/glyph) — symbol outline на Tree-sitter (Go/TS/JS/Python).
> Бинарь Go (`glyph mcp`) — канонический способ запуска (описание `uv run glyph-mcp` в `TZ_MCP_Servers_Membrana.md` §3 устарело).
> Фрагмент конфига: [`tier3-glyph.fragment.json`](./tier3-glyph.fragment.json). Fallback: [`MCP_USAGE.md`](../MCP_USAGE.md) §Tier 3.

Glyph отдаёт «скелет» символов (классы, интерфейсы, методы, сигнатуры) без чтения файлов целиком —
выигрыш на больших/незнакомых файлах и при символьном impact-анализе. Дополняет gitnexus
(файлы/пакеты) на уровне символов внутри кода.

---

## 0. Smoke — проверить, что бинарь отвечает содержательно

> «Через glyph дай outline символов в `packages/services/fft-analyzer/src/math/`.
> Ожидаю классы `FftCore`, `SpectralFluxTracker` с их публичными методами.»

**Критерий:** в ответе видны имена символов и сигнатуры методов, а не «файл не найден» / пустой список.
Если пусто — проверь, что путь абсолютный и язык TS поддержан (`glyph --help` в терминале).

---

## 1. Карта детекторного слоя

> «Через glyph построй outline всех классов и интерфейсов в
> `packages/services/trends-detector/src`, `packages/services/fft-analyzer/src` и
> `packages/services/detectors/src`. Сгруппируй по файлам, покажи только экспортируемые символы.»

Зачем: быстрый обзор детекторного контракта без открытия десятков файлов.

## 2. Контракт результата детектирования (под рефактор)

> «Через glyph найди все типы результата в trends-detector
> (`TrendsDetectionResult`, `TemplateScore`, `TemplateMatchBreakdown`, `PatternTemplate`)
> и сигнатуру `classifyTrends`. Покажи поля интерфейсов.»

Зачем: основа для правок контракта детектора — сразу видно, что и где менять (эпики `DETECTION_BASE_CONTRACT`, `TRENDS_*`).

## 3. Большие generated-графы device-board

> «Через glyph дай outline символов в
> `packages/device-board/src/graph/default-usercase-mvp-microphone-alpha-async-v2.generated.ts`
> (2274 строки) — функции и экспортируемые константы, без тела.»

Зачем: понять структуру сгенерированного графа, не читая 2k+ строк (экономия контекста).

## 4. FFT math под калибровку порогов

> «Через glyph покажи публичные методы `FftCore`, `FftAnalyzer` и `SpectralFluxTracker`
> в `packages/services/fft-analyzer/src`. Нужны сигнатуры для калибровки порогов.»

Зачем: точка входа для эпика `FFT_LAST_CHANCE_CALIBRATION` — карта вычислительного ядра.

## 5. Cross-package мост клиента

> «Через glyph дай outline функций в
> `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` (1828 строк).
> Только функции верхнего уровня и их сигнатуры.»

Зачем: навигация по самому большому файлу клиента без полного чтения.

---

## Glyph vs gitnexus — когда что

| Вопрос | Инструмент |
|--------|-----------|
| Кто импортирует `@membrana/core`, нарушены ли границы | gitnexus |
| Какие символы/методы внутри пакета, их сигнатуры | glyph |
| Impact на уровне файлов/пакетов | gitnexus |
| Impact на уровне функций/типов | glyph |
| Навигация по большому файлу без чтения | glyph |
