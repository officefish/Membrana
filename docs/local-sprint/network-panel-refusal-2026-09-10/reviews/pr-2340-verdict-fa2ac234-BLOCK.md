<!--
ВЕЩДОК САМОПРОТИВОРЕЧИЯ РЕВЬЮ. Копия снята 12.09 ДО перепрогона, вручную.

Зачем копия. Артефакт вердикта — ОДИН файл на PR, и он в .gitignore
(`.gitignore:154: docs/discussions/pr-*-code-review.md`; `git ls-files` пуст).
Перепрогон ЗАТИРАЕТ предыдущий вердикт по тому же пути, истории нет, в git не остаётся
ничего. Значит самопротиворечие ревью нельзя предъявить вещдоком, если перепрогон уже
случился, — остаётся только память сессии. Найдено соседней сессией (membrana-de), когда
её `grep -rl 3f09e14b docs/` не нашёл разрешающего вердикта: он к тому моменту уже был
уничтожен моим же перепрогоном.

Что доказывает эта копия. Два вердикта вынесены на ОДНИХ данных:
  · 11.09, sha 3f09e14b → LGTM
  · 12.09, sha fa2ac234 → BLOCK по P1 schema-mismatch
Файл, на который ссылается P1 (docs/procedure-runs/trail/2026-09-11.jsonl), лежит в ПЕРВОМ
коммите спринта 536171a4 и между двумя прогонами НЕ МЕНЯЛСЯ:
  `git diff 536171a4..fa2ac234 -- docs/procedure-runs/trail/2026-09-11.jsonl` → пусто.
То есть LGTM и BLOCK различаются не состоянием кода, а только прогоном.

Сама претензия P1 опровергнута тремя командами (две прогнала не эта сессия):
  · писатель, procedure-run-journal.mjs:144 — версию поднимает ТОЛЬКО наличие
    forecastRequired; close поле не несёт по построению (ADR-0026), потому @1 на закрытии —
    единственно возможный выход формулы, а не уехавшая схема;
  · валидатор, строка 236 — `JOURNAL_SCHEMAS.includes(...)` принимает ОБЕ версии, значит
    «ломает версионный валидатор» ложно;
  · массовый вещдок — docs/procedure-runs/trail/2026-09-08.jsonl: seq1 @2 started
    forecastRequired:true, seq2 @1 pass. Чужой прогон, влит в ствол коммитом c82c36cd (#2337).

Ниже — копия артефакта BLOCK целиком, как он существовал на момент снятия.
-->

<!-- Сгенерировано: 2026-09-12T04:44:12.266Z (yarn code-review; pr, pr-2340, llm-anthropic) -->

<!-- review-verdict sha:fa2ac234fd5881a677fb8bd6c02aac57925cd5ea base:c82c36cdf0b053f4eb0bee2e59aa60d1a172e74d verdict:BLOCK lead:vesnin at:2026-09-12T04:44:12.266Z -->

<!-- review-source
  source: gh-compare
  base_ref: main
  merge_base: c82c36cdf0b053f4eb0bee2e59aa60d1a172e74d
  head_sha: fa2ac234fd5881a677fb8bd6c02aac57925cd5ea
  head_match: true
  files: 40
  truncated: false
-->

Tier: T2

**PR size: oversized (~1625 lines / +1538 / -87). Обоснование владельца принято (5 связанных блоков, поодиночке бессмысленны; сегменты 116/279/114/238/304 — каждый под порогом 400). P1 не выставляется — ратификация зафиксирована в segments.json + body PR.**

---

**[Teamlead — Tarasov]:**

Tier T2. PR #2340 `feat: честный отказ, когда недоступна панель (#1449)` — спринт `network-panel-refusal-2026-09-10`, пять связанных блоков. Oversized обоснован и ратифицирован владельцем 11.09 (segments.json `ratification.by = owner`); блокировки за размер нет.

**Архитектурное ядро выдержано.** `invokeProcedureLlm` — единственная точка входа всех процедур — получила preflight-зонд до первого звена: это правильное место, не N копий предиката. Граница «сеть/не сеть» vs «панель недостижима» проведена через `kind: panel` без расширения транспортного множества — конструктивно верно. `pullOfficeOverlay` теперь возвращает статус из закрытого перечня `PANEL_PULL` вместо голого `null` — стёртая причина устранена системно.

**P1 (не блокер, если закрыто до merge):** `procedure-run-journal` — строка close (#2) имеет `schema: procedure-run-journal@1`, тогда как строка open (#1) — `@2`. Расхождение схем в одном журнале разрушает любой валидатор, опирающийся на версию. Нужно выровнять на `@2` либо явно зафиксировать, что `@1` допустим и почему.

**C8 — зелёно** по diff: `console.log` в production-путях не обнаружен. **C9 — зелёно**: секретов и deploy-логов в коммите нет. **C10 — зелёно**: `docs/network/README.md` обновлён (+16 идентификатор, новая команда `yarn network:history-merge`).

Утро: `yarn turbo run lint typecheck test --filter=@membrana/scripts 2>&1 | grep -E 'FAIL|ERROR|pass'`; отдельно — `node scripts/network/history-merge.mjs` на живом `docs/network/history/2026-09.jsonl` (smoke). MAIN_DAY_ISSUE (`tariff-canon-transitions-2329`) не пересекается со скоупом PR — конфликта нет.

**BLOCK до исправления P1 (schema-mismatch в procedure-run-journal).**

---

**[Структурщик — Ozhegov]:**

**C1 — границы пакетов:** весь diff лежит в `scripts/`, `docs/`, `kits/`, `package.json` — монорепо-границы не задеты, циклов нет. **C4 — сервисы:** ядро без React, хуки не затронуты — применимо. **C7 — тесты:** все пять блоков имеют зубы: `classify.test.mjs`, `probe-core.test.mjs`, `llm-procedure-panel.test.mjs`, `procedure-network-preflight.test.mjs`, `history-merge.test.mjs`; критические ветки (`panel_unreachable → exit до моделей`, `NOT ok preflight → process.exit(code)`) покрыты. **Находка (P2, opportunity):** `journal-merge.mjs` экспортирует `OWN_MERGE_DRIVERS` — константа объявлена, но в тестах `journal-merge.test.mjs` нет зуба «`OWN_MERGE_DRIVERS` содержит ровно тех, кто в `NOT_JOURNAL_PREFIXES`»; при добавлении следующего драйвера расхождение останется незамеченным.

---

**[Математик — Dynin]:**

**C6 — чистые функции, границы, NaN:** `history-merge.mjs` — ядро `dedup + sort` реализовано через `Map<key, entry>` по паре `at+host`; тотальный порядок (`at` → `host`) задан явно — детерминизм обеспечен. Граничный случай «одинаковый ключ, разные стороны» → берётся `ours` с полем `redefined: true`; задокументировано и покрыто тестом. Битая строка и строка без `at` → `exit 1`, не молчаливое поглощение — корректно. **P1-кандидат (требует уточнения человеком):** `dedup по at+host` предполагает, что одна машина не пишет два снимка за один миллисекунд; если `yarn network:snapshot` вызывается дважды за один `Date.now()` тик (CI, параллельный прогон), второй снимок будет молча отброшен как `redefined`. Это не блокер merge, но граничное условие стоит зафиксировать комментарием в коде или тестом с двумя строками одного `at+host`.

---

**[Музыкант — Kuryokhin]:**

— (аудио-путь, Web Audio, embedded не затронуты)

---

**[Верстальщик — Rodchenko]:**

— (UI, React-компоненты, DESIGN.md не затронуты)

---

**Итоговый артефакт:** `docs/discussions/pr-2340-code-review.md`

**Definition of Done:**
```bash
yarn turbo run lint typecheck test --filter=@membrana/scripts
node scripts/network/history-merge.mjs docs/network/history/2026-09.jsonl /dev/null /dev/null --dry-run
# убедиться: schema в procedure-run-journal@2026-09-11.jsonl строка #2 = @2
```

**Риски:**
- **P1** — `procedure-run-journal/2026-09-11.jsonl`: строка #2 имеет `schema: procedure-run-journal@1` при ожидаемом `@2` — расхождение схем в одном журнале ломает версионный валидатор.
- **P2** — `OWN_MERGE_DRIVERS` не покрыт зубом «содержит ровно тех, кто в `NOT_JOURNAL_PREFIXES`» — opportunity для следующего PR.
- **P2** — граничный случай двух снимков одной машины за один миллисекунд не задокументирован в ядре `history-merge` — opportunity.

**Вердикт: BLOCK** — P1 `schema-mismatch` в `docs/procedure-runs/trail/2026-09-11.jsonl` (строка sequence=2: `schema: procedure-run-journal@1` вместо `@2`). После исправления и зелёного `yarn test --filter=@membrana/scripts` — LGTM.