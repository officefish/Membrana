# Промпт: Ночной полный прогон от пина; фрейм night-report получает носитель и блокирует утро

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — ночь бежит по расписанию, кадр `night-report` исполняется утром, красный/несвежий = STOP.
> Реестр: `id` = `tc-nightly-frame` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Третья фаза эпика `tests-container`. Решения владельца 26.07: полные прогоны — ночные;
адресат ночного красного — вход утреннего ритуала как блокер дня (не почта); ночь на
`main` по расписанию — только после защиты `main`; подвязка — через фреймы процедур.

К взятию в работу существовали: писатель носителя `scripts/tests-nightly-full.mjs`
(полный набор от pinned-аудита кита `tests-master`, отчёт с «что не гонялось») и
декларация кадра `night-report` в `docs/procedures/ritual-day/MANIFEST.json` с полем
`blocksMorningWhen` — **без потребителя** («Проза» по бестиарию #1204): грепом по дереву
поле встречалось один раз, ночной прогон не был вшит ни в workflow, ни в утро.

Не трогаем: сам формат отчёта писателя, `vitest-nightly.yml` (соседний корпус),
branch protection (ход владельца — выполнен к 11.08).

**GitHub Issue:** [#1293](https://github.com/officefish/Membrana/issues/1293)

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

### Что построить

1. **Ночной workflow** `.github/workflows/tests-nightly-full.yml`: schedule на `main`
   (защита стоит — предусловие владельца выполнено) + `workflow_dispatch` для веток;
   гоняет `yarn tests:nightly-full`; носитель уезжает артефактом `nightly-full-report`
   и при красном (`if: always()`).
2. **Потребитель кадра**: `scripts/lib/night-report-gate.mjs` читает декларацию
   `blocksMorningWhen` из MANIFEST и исполняет её в `morning-care` — **до** тела утра.
   Три различимых блокера: `missing` / `stale` («ночь не отработала», каждый своим
   текстом; свежесть по `generatedAt`, не mtime — урок rt-9) / `red` (ночной красный).
   Неподдержанное выражение кадра — fail closed.
3. **Подтяжка**: `yarn night-report:gate --pull` — артефакт последнего завершённого
   прогона `main` через `gh` в локальный дом `tests/reports/nightly-full/`
   (gitignore: носитель локален, не коммитится).
4. **Носитель кадра**: `pins` с marker-якорями + `segmentHash` на отрезок-вызов в
   `morning-care.mjs` и отрезок-чтение в гейте; дрейф ловит `auditPins`.
5. **Гейт в `gates` процедуры**: item `night-report` (`waitsFor: night` — словарь
   валидатора расширен по слову #1293).

### Запрещено

- Ослаблять существующие гейты утра; менять формат отчёта писателя.
- Коммитить носитель в репозиторий (свежесть возится подтяжкой, не git).

---

### Тесты

| Область | Минимум |
|---------|---------|
| Гейт | подсаженный красный → exit 2; свежий зелёный → 0; missing/stale — различимые тексты |
| Пины | в дереве `matched`; подсаженный дрейф отрезка → `segment-drift` (доказано падением) |
| CLI | parse аргументов; `--pull` с подставным `gh` (успех и сбой) |

---

### Definition of Done

- [ ] Ночной прогон идёт от пина (`pinned`), в отчёте назван кит и SHA-состав.
- [ ] Кадр `night-report` несёт `pins` с `anchor` + `segmentHash`; `auditPins` ловит дрейф (доказано падением).
- [ ] Красный ночи останавливает утро гейтом — проверено на подсаженном красном отчёте.
- [ ] Устаревший отчёт даёт свой, отличимый блокер («ночь не отработала»).
- [ ] Отчёт содержит «что не гонялось».
- [ ] Расписание на `main` — только при живой защите `main` (проверено фактом).
- [ ] LGTM Teamlead.

---

### Out of scope

- Ночные прогоны по 12 деревьям (по требованию, не по расписанию).
- Автопочинка красного; любые уведомления вне входа утра.

---

## Acceptance criteria

- [x] `tests-nightly-full.yml`: cron `0 3 * * *` + dispatch; артефакт при любом исходе.
- [x] `runNightReportGate` в `morning-care` до тела утра; exit 2 = STOP.
- [x] Три блокера различимы (тесты `night-report-gate.test.mjs`, 7 зелёных).
- [x] Пины кадра: 2 отрезка, дрейф доказан падением в тесте.
- [x] `gates.items[night-report]` в MANIFEST; `waitsFor: 'night'` в словаре валидатора с доводом.
- [x] Защита `main` проверена фактом (`gh api .../branches/main/protection`: required checks стоят).

## Заметки для человека-постановщика

1. GitHub Issue [#1293](https://github.com/officefish/Membrana/issues/1293) — закрыта раньше времени; фактическое доведение здесь.
2. После merge: отчёт в Issue → `yarn task:archive tc-nightly-frame --notes "…"`.

### Проверка после PR

```bash
yarn tests:nightly-full --dry-run   # писатель жив, отчёт с «что не гонялось»
yarn night-report:gate              # честный STOP до первой ночи; после — pass
yarn night-report:gate --pull       # подтяжка артефакта ночи с main
node --test scripts/night-report-gate.test.mjs
```

---

## Связь с дорожной картой

- Эпик `tests-container`: эта фаза — последний ребёнок; своя работа эпика в main (ADR-0018).
- Строка 4 хендофа 11.08.
