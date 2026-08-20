# Membrana Local Sprint OPEN: mfcc-first-field-probe

| Поле | Значение |
|------|----------|
| Sprint | `mfcc-first-field-probe` (S, фаза эпика `server-plugin-foundation`, #1961) |
| Prompt | [`MFCC_FIRST_FIELD_PROBE_PROMPT.md`](../../prompts/MFCC_FIRST_FIELD_PROBE_PROMPT.md) · вход сессии `SESSION_B_RESULTS_MFCC_SPRINT_2026-08-20.md` |
| Cut plan | [`mfcc-first-field-probe.json`](../../sprint/cut/mfcc-first-field-probe.json) · ратифицирован владельцем 20.08 11:10Z («Ратифицирую») |
| Cutter context | Веснин ([`mfcc-first-field-probe-cut.md`](../../discussions/mfcc-first-field-probe-cut.md)): предикат явный, анти-критерий, полный адрес, разблокировка списком — внесено |
| Lead | vesnin · support dynin, kuryokhin |
| Status | closed 20.08 · гейт 2/2 honest_pair · род опыта hit (2/2) |

## Итог

Два вызова боевого входа `request` (b4) с `sampleId 89e428ba` (запись узла Firebat):
оба HTTP 201, `bridge sent` с первой попытки, runId `01a01ede-3eb5…` / `01a01ede-4f40…`.
Предикат идемпотентности ВЫЧИСЛЕН и расширен по ревью Дынина (`outputHashEqual`,
`passportEqual`, `activeRunsCount==2`, `completedAtOrdered`) — `holds: true`. Прежние
прогоны 18.08/19.08 при чтении с новым `currentInputHash` — `stale: true` (M3 живьём).

**Вердикт по существу (Курёхин):** фон помещения без дрона — `detected` passRate 1
(116/116 кадров), как и все 48кГц-пробы: ворота первой прикидки на реальном тракте —
разрешительная печать, специфичности нет. Гипотеза нарезки подтвердилась; провод чист
(анти-критерий не наступил). Вход разблокировки `mfcc-compare` — пятью пунктами в
`docs/plugins/mfcc-first-field-probe-2026-08-20.md`.

## Остаток, названный Дыниным (не этот спринт)

Третий вызов после рестарта узла при неизменном `configHash` — устойчивость к перезагрузке;
`outputHash` в контракте `RunFingerprints` — вопрос Архитектору рядом с #1982.
