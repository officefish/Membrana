# Черновик прецедента one-shot · строка 3 хендофа 09.08 · вердикты по красным прогонам детекторов

**Статус:** согласие с обоснованием (§6 процедуры) — ратификация «Да, исполняй» (чат 10.08),
исполнение завершено: [`../2026-08-10-detectors-red-ci-verdict-foreign-tree.md`](../2026-08-10-detectors-red-ci-verdict-foreign-tree.md).
**Процедура:** [`docs/procedures/one-shot/`](../../procedures/one-shot/README.md), первый фрейм.
**Дата:** 2026-08-10. **Агент:** Claude Code. **Штамп S:** tarasov (LGTM, см. границы ниже).

## Находка

Строка 3 десятки хендофа 09.08: три красных прогона детекторных сервисов
(`cepstral` / `harmonic` / `spectral-flux`) третий день без судьи — нужна одна строка
«аудио-дефект / инфраструктура» на каждый.

## Разведка (вещдоки, 2026-08-10)

- GitHub CI всех трёх — **зелёный**: последние прогоны `CI` / `Unit tests` /
  `Scheduled CI` на main 09–10.08 — success (`gh run list`).
- Локально: `yarn turbo run typecheck test --filter=<трое>` — typecheck красный у всех
  трёх (TS2305: нет `averageMagnitudes` / `geometricMeanMagnitudes` / `prepareFftSamples`
  / `fftFrames` в `@membrana/detector-base`), у `harmonic` красные 3 теста
  (`averageMagnitudes is not a function`).
- Корень: `node_modules/@membrana/detector-base` — симлинк от 29.07 в чужое дерево
  `Membrana-grok`, где `sample-window.ts` отсутствует (grep: 0 вхождений). В нашем
  дереве все четыре функции живут в
  `packages/services/detectors/base/src/sample-window.ts` и реэкспортируются из
  `index.ts:34-37`. Класс долга #1647 (foreign-tree resolution).

## Штамп S тимлида (tarasov)

LGTM. Границы жёстко: только прецедент с тремя однострочными вердиктами и вещдоками;
**починка симлинков в шот не входит** (долг класса #1647 — отдельной задачей); в теле
прецедента явная строка «локальный красный ≠ дефект детектора».

## Предикат S (forecast)

`evaluateOneShotS`: **ok=true** — `within_file_limit` (1 файл), `within_line_limit`
(~80 строк), `no_server_paths`, `chain_clear` (в окне 7 суток последний шот 08.08,
семья `docs/precedents` чиста).

## Чек-лист (§5 процедуры — продублирован из чата в момент показа)

- [x] Назови находку одной фразой: три красных прогона детекторов без судьи — судейство одной строкой на каждый
- [x] Запроси штамп S у тимлида (не ставь сам) — tarasov, LGTM
- [x] Прогони evaluateOneShotS на дифф + recentShots — ok=true, reasons приложены
- [x] Перечисли файлы: `docs/precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md` (+ пересборка индекса прецедентов, если её требует `precedent:register`)
- [x] Подтверди: серверных путей нет
- [x] Дождись ратификации владельца — «Да, исполняй» (чат 10.08)
- [x] Допиши весь код до «готово к ревью»; ревью/мердж — снаружи

## Планируемые вердикты (исполнение — после «да» владельца)

| Детектор | Вердикт (одна строка) |
|---|---|
| `cepstral` | **инфраструктура** — TS2305 из симлинка в устаревший Membrana-grok; GitHub CI зелёный |
| `harmonic` | **инфраструктура** — тот же корень + рантайм-падение тестов на чужом dist; GitHub CI зелёный |
| `spectral-flux` | **инфраструктура** — TS2305 (`fftFrames`/`prepareFftSamples`), тот же корень; GitHub CI зелёный |
