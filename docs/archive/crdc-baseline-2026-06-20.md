# CRDC D0 — Baseline audit (2026-06-20)

> Эпик: `code-review-debt-closeout-jun2026` · Issue [#126](https://github.com/officefish/Membrana/issues/126)  
> Ветка: `techies68` @ `1d29202` (merge `origin/main` после `4801894`)  
> Команда: `yarn turbo run lint typecheck test build --continue` → **118/118 OK**, exit **0**  
> Полный лог: [`crdc-baseline-2026-06-20-turbo.log`](./crdc-baseline-2026-06-20-turbo.log)

---

## Уже закрыто до D0 (не повторять)

| PR | Что снято |
|----|-----------|
| [#87](https://github.com/officefish/Membrana/pull/87) | Turbo build green apps, честный typecheck |
| [#124](https://github.com/officefish/Membrana/pull/124) | Device-board MVP, catalog, streaming host |
| [#125](https://github.com/officefish/Membrana/pull/125) | Deploy-log `.gitignore`, `docs-dev` Node guard |

---

## Матрица рисков R1–R12

| ID | Риск | Приоритет | Baseline 2026-06-20 | Фаза |
|----|------|-----------|---------------------|------|
| **R1** | `cabinet → background-media` только HTTP | 🔴 | ✅ **PASS** — `rg background-media apps/cabinet/src` → 0 | D1 verify |
| **R2** | `MembraneRegistry` до первой квоты | 🔴 | ⚠️ **TBD** — `main.tsx`: `registerClientModules()` → `finalizeRegistration()` до `initMediaLibraryHubBridge()`; нет unit-теста / комментария в коде | **D1** |
| **R3** | `@membrana/client#lint` exit 1 | 🔴 | ✅ **PASS** — exit 0, 2 warnings (`TelemetryJournalModule` exhaustive-deps) | D2 warnings |
| **R4** | `trends-detector` exit 134 OOM | 🔴 | ✅ **PASS** — 13 tests, 1.38s | — |
| **R5** | `audio-engine` / `fft-analyzer` WARNING / passWithNoTests | 🟡 | 🟡 **PARTIAL** — fft: 15 tests; audio-engine: 2 tests но script `--passWithNoTests` | **D3** |
| **R6** | `device-board` coverage | 🟡 | 🟡 **PARTIAL** — ~26 unique `*.test.ts`; lint 3 warnings (`board-flow-node`, `device-board-shell`) | D2 + D3 |
| **R7** | WaveformPlayer a11y (aria, Escape, row ≤48px) | 🟡 | 🟡 **PARTIAL** — `CabinetSamplePlayerSection`: `role="region"`, `aria-label`; `useSamplePlaybackEscapeKey()`; inline table player из старого review заменён секцией над таблицей — нужен axe + row height check | **D4** |
| **R8** | Services → device-board reverse imports | 🔴 | ✅ **PASS** — `grep from.*device-board packages/services/` → 0 | D1 verify |
| **R9** | Web Audio в UI device-board | 🔴 | ✅ **PASS** — `rg AudioContext\|getUserMedia packages/device-board` → 0 | D1 verify |
| **R10** | Deploy logs / local AI dirs в repo | 🟡 | 🟡 **PARTIAL** — `/cabinet-recover*.txt`, `/deploy-*.txt` в `.gitignore` (#125); только `.claude/claude_code_config.json`, `.continue/config.json` — не целые каталоги | **D5** |
| **R11** | Docker image cabinet >50 МБ | 🟢 | ⏸ **DEFER** — не замеряли на D0 | **D5** |
| **R12** | Mintlify UI vs DESIGN.md | 🟢 | ⏸ **DEFER** — turbo `@membrana/docs` build OK; ручной visual parity не проверяли | **D5** |

---

## Точечные прогоны (D0)

| Команда | Результат |
|---------|-----------|
| `yarn workspace @membrana/client lint` | exit **0** (2 warnings) |
| `yarn workspace @membrana/device-board lint` | exit **0** (3 warnings) |
| `yarn workspace @membrana/trends-detector-service test` | exit **0**, 13 passed |
| `yarn workspace @membrana/audio-engine-service test` | exit **0**, 2 passed |
| `yarn workspace @membrana/fft-analyzer-service test` | exit **0**, 15 passed |
| `yarn turbo run lint typecheck test build --continue` | **118/118**, exit **0**, ~3m53s |

---

## Вывод Teamlead (D0)

После merge `main` (**#124/#125**) большинство 🔴 из review **2026-06-19** уже зелёные. Оставшийся scope эпика сужается до:

1. **D1** — формализовать R2 (тест или контрактный комментарий + audit cabinet quota path).
2. **D2** — 5 ESLint exhaustive-deps warnings (client + device-board).
3. **D3** — убрать `--passWithNoTests` у audio-engine при наличии тестов; зафиксировать политику.
4. **D4** — axe + row height для sample-library player.
5. **D5** — `.claude/`, `.continue/` целиком; docker size note.

**D6** — финальный turbo + archive эпика.

---

## Следующий шаг

Старт **D1** (`crdc-d1-boundaries-registry`): Ozhegov — grep-скрипт + MembraneRegistry init test.
