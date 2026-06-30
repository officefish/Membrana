# BACKLOG-CLEANUP-S1: Аудит и закрытие Queue A + #157

**Issue:** [#214](https://github.com/officefish/Membrana/issues/214)  
**Sprint:** `backlog-cleanup-s1`  
**Дата:** 2026-06-30  
**Источник:** `docs/discussions/github-issues-status-report-2026-06-30.md`

## Контекст

23 открытых issue, большинство без assignee/milestone. Отчёт выделил Queue A (возможно уже реализовано) и несколько S-задач. Цель: очистить backlog, не открывая новых больших спринтов.

## Фазы

### BC1 — Verify & close: #146, #151, #54
- **#146** W0-H1 палитра в function editor → PR #162 merged; проверить acceptance на `main`; закрыть или зафиксировать остаток
- **#151** Epic W0 hotfixes → эпик над #146; закрыть при полном DoD дочерних
- **#54** MCP rollout acceptance → проверить composite test и deployment record; закрыть или сузить

### BC2 — Аудит тестового долга: #7, #8, #34
- **#7** agenda store/registry tests → сверить с текущими тестами
- **#8** client registration smoke tests → проверить smoke coverage
- **#34** FFT edge-case docs → зависит от #10; закрыть или задокументировать residual

### BC3 — S-PR: #11 viz config tests
- Проверить текущую нормализацию и тесты
- Закрыть если покрыто; написать S-PR если есть пробел

### BC4 — S-PR: #9 microphoneStreamHub tests
- Конкретный scope: replay/unsubscribe/isolation
- Один PR с тремя группами тестов

### BC5 — P0: #157 dissolve comment group
- Пользовательский риск: потеря узлов при dissolve
- Реализация с тестом undo/save-reload

## Definition of Done
- [ ] #146 закрыт (с доказательством) или residual зафиксирован
- [ ] #151 закрыт или остаток в дочерних
- [ ] #54 закрыт или сужен до актуального scope
- [ ] #7, #8, #34 — каждый с комментарием: done / residual / obsolete
- [ ] #11 закрыт (verify или S-PR merged)
- [ ] #9 закрыт (S-PR merged)
- [ ] #157 закрыт (реализация + тест)
- [ ] CLOSURE.md
