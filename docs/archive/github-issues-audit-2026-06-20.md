# GitHub Issues Audit — 2026-06-20

> Процесс: [`GITHUB_ISSUES_AUDIT_PROMPT.md`](../prompts/GITHUB_ISSUES_AUDIT_PROMPT.md)  
> Manifest: [`github-issues-audit-2026-06-20.json`](../issues/manifests/github-issues-audit-2026-06-20.json)  
> Координатор: **Vesnin**  
> Ветка: `techies68` @ `e8f6078`  
> Turbo: **118/118** (exit 0)  
> Первый формализованный аудит после CRDC (#126, PR #127). Закрыто 13 issues; остаётся 19 open.  

## Сводка

| Метрика | Значение |
|---------|----------|
| Закрыто в этом аудите | **13** |
| Открытых (ранжировано) | **19** |
| Open на GitHub (fetch) | **19** |

---

## 1. Закрытые issues

| # | Persona | Reason | Кратко | Registry |
|---|---------|--------|--------|----------|
| [#24](https://github.com/officefish/Membrana/issues/24) | Ozhegov | `completed` | yarn check:boundaries — 4 правила графа пакетов (CRDC D1, PR #127). | — |
| [#25](https://github.com/officefish/Membrana/issues/25) | Vesnin | `completed` | MembranaRegistry + finalizeRegistration до quota; bootstrap-order.test.ts. | — |
| [#26](https://github.com/officefish/Membrana/issues/26) | Ozhegov | `completed` | README fft-analyzer документирует math/ vs hooks; split npm не нужен. | — |
| [#28](https://github.com/officefish/Membrana/issues/28) | Dynin | `completed` | core#test exit 1 не воспроизводится; в core есть contract-тесты. | — |
| [#30](https://github.com/officefish/Membrana/issues/30) | Ozhegov | `completed` | Architecture decision: публичный API telemetry-service допустим из plugin. | — |
| [#31](https://github.com/officefish/Membrana/issues/31) | Vesnin | `not planned` | Вынос filter/search в сервис deferred после TJ live refactor. | — |
| [#32](https://github.com/officefish/Membrana/issues/32) | Dynin | `completed` | fft-analyzer math/ импорты чистые; 15 тестов; README фиксирует границу. | — |
| [#35](https://github.com/officefish/Membrana/issues/35) | Rodchenko | `completed` | Аватары Музыканта и Rodchenko добавлены в VIRTUAL_TEAM_PROMPT.md. | — |
| [#36](https://github.com/officefish/Membrana/issues/36) | Vesnin | `completed` | Meta про расхождения code-review superseded CRDC + turbo green. | — |
| [#37](https://github.com/officefish/Membrana/issues/37) | Vesnin | `completed` | Индекс issues #28–#36 закрыт после пакетного триажа 2026-06-20. | — |
| [#46](https://github.com/officefish/Membrana/issues/46) | Vesnin | `completed` | Smoke-тест Linear-синхронизации выполнен; тикет не продуктовый. | — |
| [#78](https://github.com/officefish/Membrana/issues/78) | Vesnin | `completed` | DDR1–4 shipped: detector-report, DroneDetectionReportView, telemetry v1 payload. | `drone-detector-detail-report` |
| [#79](https://github.com/officefish/Membrana/issues/79) | Vesnin | `completed` | TJ1–6 shipped: live journal, tracks/reports, cabinet parity, filters. | `telemetry-journal-live-refactor` |

---

## 2. Открытые issues — рейтинг

### 🔴 **Важно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#92](https://github.com/officefish/Membrana/issues/92) | MP7: Node Realtime Gateway — WebSocket для журнала и live-микрофона | Vesnin | MP7 Node Realtime Gateway: WSS journal + mic-live; NR0–NR6. | `membrane-node-realtime-gateway` |
| [#94](https://github.com/officefish/Membrana/issues/94) | [Imperfection] Сделать деплой детерминированным, гейтированным и откатываемым | Ozhegov | Deploy pipeline: CI gate, registry pull, rollback — postmortem MP7b class. | `deploy-pipeline-refactor` |
| [#95](https://github.com/officefish/Membrana/issues/95) | Device-Board Refactor v0.4: variables, Event node, dataflow resolution, fullscreen (DBR0-DBR6) | Vesnin | Device-board v0.4 (DBR0–DBR6): variables, Event node, dataflow — архитектурная ветка vesnin. | `device-board-refactor-v04` |

### 🟡 **Рекомендовано**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#12](https://github.com/officefish/Membrana/issues/12) | [Imperfection] Добавить yarn test:scripts отдельным шагом в CI | Ozhegov | Добавить yarn test:scripts в ci.yml — тесты уже есть, один шаг. | — |
| [#57](https://github.com/officefish/Membrana/issues/57) | Редактор пользовательских шаблонов trends-fft | Dynin | Редактор пользовательских trends-fft шаблонов + frameHitRatio scoring. | `trends-fft-template-editor` |
| [#58](https://github.com/officefish/Membrana/issues/58) | background-media v1: сервер сэмплов и trends-шаблонов для web | Ozhegov | background-media v1: A5a/A5b в repo; client remote-server — follow-up. | `background-media-v1` |
| [#59](https://github.com/officefish/Membrana/issues/59) | Deploy background-media to production VPS (A5c) | Ozhegov | A5c: prod deploy background-media на VPS + TLS smoke. | `background-media-a5c-deploy` |

### 🟢 **Не срочно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#7](https://github.com/officefish/Membrana/issues/7) | [Imperfection] Покрыть unit-тестами store/registry в @membrana/agenda | Ozhegov | Unit-тесты agenda store/registry — центральный пакет без coverage. | — |
| [#10](https://github.com/officefish/Membrana/issues/10) | [Imperfection] Unit-тесты на чистую математику в @membrana/fft-analyzer-service | Dynin | Расширить fft math unit-тесты (edge cases) — база есть (#32 закрыт). | — |
| [#29](https://github.com/officefish/Membrana/issues/29) | ci: ensure fft/core vitest runs are visible in turbo test pipeline | Ozhegov | Turbo test visibility: outputs warnings, passWithNoTests policy частично в CRDC D3. | — |
| [#49](https://github.com/officefish/Membrana/issues/49) | Выразительный блок захвата микрофона (MicrophoneCapturePanel) | Rodchenko | MicrophoneCapturePanel — консилиум готов; отложен до stage-gate detection. | — |
| [#54](https://github.com/officefish/Membrana/issues/54) | [Wish] MCP rollout acceptance: composite test 7.7 and deployment record | Ozhegov | MCP rollout acceptance 7.7 — verify-mcp-bootstrap есть; composite gate не закрыт. | `mcp-rollout-acceptance` |
| [#93](https://github.com/officefish/Membrana/issues/93) | Membrana Studio — настольная расширенная версия (MS0–MS5) | Vesnin | Membrana Studio desktop (MS0–MS5) — после MP7/NR6 hardening. | `membrana-studio-desktop` |

### ⚪ **Не обязательно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#8](https://github.com/officefish/Membrana/issues/8) | [Imperfection] Покрыть smoke-тестами регистрацию модулей и плагинов в apps/client | Ozhegov | Smoke регистрации всех модулей — частично bootstrap-order.test.ts (CRDC D1). | — |
| [#9](https://github.com/officefish/Membrana/issues/9) | [Imperfection] Тесты на microphoneStreamHub (replay для поздних подписчиков) | Ozhegov | Тесты microphoneStreamHub late subscriber — малый ROI файл. | — |
| [#11](https://github.com/officefish/Membrana/issues/11) | [Imperfection] Тесты на resolveMicStreamVizConfig в microphone-stream-viz | Ozhegov | Тесты resolveMicStreamVizConfig — persist normalization. | — |
| [#27](https://github.com/officefish/Membrana/issues/27) | client: Storybook and a11y for FFT/Oscilloscope; graceful degradation | Rodchenko | Storybook + a11y FFT/Oscilloscope modules. | — |
| [#33](https://github.com/officefish/Membrana/issues/33) | ui: telemetry-journal a11y, DESIGN alignment, optional Storybook | Rodchenko | Telemetry-journal a11y/Storybook — live UI улучшен, полный scope не закрыт. | — |
| [#34](https://github.com/officefish/Membrana/issues/34) | docs: document FFT edge cases and windowing assumptions | Dynin | JSDoc FFT edge cases / windowing — README частично покрывает. | — |

---

## Follow-up

Закрытые issues с active registry (нужен `yarn task:archive`):
- `drone-detector-detail-report` (Issue #78)
- `telemetry-journal-live-refactor` (Issue #79)

*Сгенерировано: `yarn issues:audit` · 2026-06-20*