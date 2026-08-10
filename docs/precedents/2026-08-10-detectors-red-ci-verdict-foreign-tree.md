# Прецедент 2026-08-10: Три «красных CI» детекторов судимы — все три инфраструктура (чужое дерево), не аудио-дефект

<!-- precedent-meta
{
  "id": "2026-08-10-detectors-red-ci-verdict-foreign-tree",
  "date": "2026-08-10",
  "class": "session-report",
  "symptom": "Локальные прогоны трёх детекторных сервисов (cepstral / harmonic / spectral-flux) красные третий день, вердикта «аудио-дефект / инфраструктура» нет — краснота блокирует доверие к ночному прогону (строка 3 десятки хендофа 09.08)",
  "rootCause": "node_modules/@membrana/detector-base — симлинк от 29.07 в чужое дерево Membrana-grok, где sample-window.ts отсутствует; TS2305 на averageMagnitudes / geometricMeanMagnitudes / prepareFftSamples / fftFrames и рантайм-падение тестов harmonic — резолюция, не код. GitHub CI всех трёх зелёный. Класс долга #1647 (foreign-tree resolution)",
  "fix": "Три вердикта записаны: cepstral — инфраструктура; harmonic — инфраструктура; spectral-flux — инфраструктура. Локальный красный ≠ дефект детектора; блок с ночного прогона снят по инфраструктуре",
  "canonicalCause": "Проверка врёт о предмете: красный локальный прогон говорил не о детекторах, а о симлинках node_modules в устаревшее соседнее дерево",
  "prevention": "Починка симлинков — отдельная задача класса #1647 (в шот не входит, граница штампа тимлида). До починки локальной красноте детекторов не верить без сверки с GitHub CI",
  "actionItems": [
    {"text": "Завести задачу на починку резолюции node_modules/@membrana/* (симлинки в Membrana-grok от 29.07) — yarn install / переустановка линков", "owner": "tarasov", "status": "open"}
  ],
  "related": []
}
-->

**Процедура:** [`docs/procedures/one-shot/`](../procedures/one-shot/README.md), первый фрейм.
**Штамп S:** tarasov (LGTM). **Предикат** `evaluateOneShotS` (forecast): ok=true —
`within_file_limit · within_line_limit · no_server_paths · chain_clear`.
**Ратификация владельца:** «Да, исполняй» (чат 10.08, черновик чек-листа —
[`drafts/2026-08-10-oneshot-detectors-red-ci-verdict.md`](drafts/2026-08-10-oneshot-detectors-red-ci-verdict.md)).

## Вердикты — по одной строке на детектор

| Детектор | Вердикт |
|---|---|
| `cepstral` | **инфраструктура** — TS2305 (`geometricMeanMagnitudes`, `prepareFftSamples`) из симлинка в устаревший Membrana-grok; GitHub CI зелёный |
| `harmonic` | **инфраструктура** — тот же корень; 3 теста падают рантаймом `averageMagnitudes is not a function` на чужом dist; GitHub CI зелёный |
| `spectral-flux` | **инфраструктура** — TS2305 (`fftFrames`, `prepareFftSamples`), тот же корень; GitHub CI зелёный |

**Локальный красный ≠ дефект детектора; блок снят по инфраструктуре** (формула — граница
штампа тимлида).

## Вещдоки (сверены 2026-08-10)

- **GitHub CI зелёный.** `gh run list`: `CI` / `Unit tests` / `gitleaks` на main
  09.08 18:05 UTC — success; `Scheduled CI` 10.08 07:19 UTC — success; ветка
  `night-hunt/services-api-drift-1786359635917` 10.08 11:00 UTC — success. Красных
  прогонов детекторных workflow (`detector-drift-gate`) нет с 01.08.
- **Локальная краснота воспроизведена.**
  `yarn turbo run typecheck test --filter=@membrana/{cepstral,harmonic,spectral-flux}-detector-service`:
  typecheck exit 1 у всех трёх; `harmonic` — `3 failed | 10 passed`.
- **Тексты ошибок.** Все — TS2305 «Module '"@membrana/detector-base"' has no exported
  member …» на четыре функции окна: `averageMagnitudes`, `geometricMeanMagnitudes`,
  `prepareFftSamples`, `fftFrames`.
- **Корень.** `ls -la node_modules/@membrana/` → `detector-base ->
  /c/Users/user190825/practice/Membrana-grok/packages/services/detectors/base`
  (симлинк от 29.07, как и все `*-detector-service`). В дереве Membrana-grok
  `sample-window.ts` отсутствует (grep по четырём именам: 0 вхождений в
  `base/src/index.ts`, файла `sample-window.ts` нет).
- **В нашем дереве код исправен.** Четыре функции определены в
  `packages/services/detectors/base/src/sample-window.ts` (строки 42–142) и
  реэкспортированы из `index.ts` (строки 34–37) — ровно то, что импортируют трое
  детекторов и что видит зелёный GitHub CI.

## Границы шота

Починка симлинков в шот **не входит** — условие штампа тимлида: это долг класса #1647,
он заводится отдельной задачей (см. actionItems). Шот кончается на записанных вердиктах.
