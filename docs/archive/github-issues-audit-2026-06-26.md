# GitHub Issues Audit — 2026-06-26

> Процесс: [`GITHUB_ISSUES_AUDIT_PROMPT.md`](../prompts/GITHUB_ISSUES_AUDIT_PROMPT.md)  
> Manifest: [`github-issues-audit-2026-06-26.json`](../issues/manifests/github-issues-audit-2026-06-26.json)  
> Координатор: **Vesnin**  
> Ветка: `fix/async-v2-l18-l19-recording-detached`  
> DB3H-S1 tech-debt sprint. RAG index --full out of scope (no OPENAI_API_KEY). Focus: CI green, lint, issues triage, registry hygiene.  

## Сводка

| Метрика | Значение |
|---------|----------|
| Закрыто в этом аудите | **0** |
| Открытых (ранжировано) | **10** |
| Open на GitHub (fetch) | **27** |
| ⚠️ Не в manifest | #141, #131, #95, #94, #92, #59, #58, #57, #54, #49, #34, #33, #29, #27, #11, #10, #9 |

---

## 1. Закрытые issues

| # | Persona | Reason | Кратко | Registry |
|---|---------|--------|--------|----------|

---

## 2. Открытые issues — рейтинг

### 🔴 **Важно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#178](https://github.com/officefish/Membrana/issues/178) | fix(comp-packaging): async-v2 track upload fails — blocks detached drone report | Rodchenko | comp-packaging: async-v2 track upload fails — блокер detached drone report. | `comp-packaging-catalog-2026-06-25` |
| [#180](https://github.com/officefish/Membrana/issues/180) | fix(async-v2): L18 clip recorder re-arm + L19 detached report bridge | Rodchenko | async-v2 L18 clip recorder re-arm + L19 detached report — активная ветка спринта E. | — |

### 🟡 **Рекомендовано**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#12](https://github.com/officefish/Membrana/issues/12) | [Imperfection] Добавить yarn test:scripts отдельным шагом в CI | Ozhegov | yarn test:scripts в CI — часть DB3H-S1 phase D. | — |
| [#146](https://github.com/officefish/Membrana/issues/146) | [Bug] W0-H1: палитра узлов в редакторе пользовательских функций | Rodchenko | W0-H1 function palette в редакторе функций. | `db-w0-h1-function-palette` |
| [#151](https://github.com/officefish/Membrana/issues/151) | Epic: Device-board W0 hotfixes — polish из редактирования | Ozhegov | Epic W0 hotfixes — db-w0-h1/h2/h3 в registry active. | `device-board-w0-hotfix` |
| [#153](https://github.com/officefish/Membrana/issues/153) | [Bug] W0-H3: выделение сохраняется при закрытии модалки группирования | Rodchenko | W0-H3 selection modal keep. | `db-w0-h3-selection-modal-keep` |
| [#157](https://github.com/officefish/Membrana/issues/157) | device-board: при удалении comment group не удалять дочерние узлы | Ozhegov | Comment group delete — не удалять дочерние узлы. | — |

### 🟢 **Не срочно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#144](https://github.com/officefish/Membrana/issues/144) | Epic: Tasks Audit v1 — bookkeeping, reviewing, scripts | Vesnin | Tasks Audit v1 epic — bookkeeping scripts (tasks-audit.mjs missing). | — |

### ⚪ **Не обязательно**

| # | Title | Persona | Кратко | Registry |
|---|-------|---------|--------|----------|
| [#7](https://github.com/officefish/Membrana/issues/7) | [Imperfection] Покрыть unit-тестами store/registry в @membrana/agenda | Dynin | Unit-тесты agenda store/registry. | — |
| [#8](https://github.com/officefish/Membrana/issues/8) | [Imperfection] Покрыть smoke-тестами регистрацию модулей и плагинов в apps/client | Rodchenko | Smoke регистрации модулей client. | — |

---

## 3. Расхождения manifest ↔ GitHub

- **Open на GitHub, нет в manifest:** #141, #131, #95, #94, #92, #59, #58, #57, #54, #49, #34, #33, #29, #27, #11, #10, #9

---

## Follow-up

- —

*Сгенерировано: `yarn issues:audit` · 2026-06-26*