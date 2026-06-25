# Регламент: operator debug competition UserCase (Phase C)

> **Phase C** packaging sprint: последовательная отладка fork'ов в браузере после `comp:publish-catalog`.  
> Цель — не только `smoke PASS`, но и **накопление уроков** для следующих соревнований.

Связано: [`COMPETITION_CATALOG_PUBLISH_REGULATION.md`](./COMPETITION_CATALOG_PUBLISH_REGULATION.md) · [`USERCASE_COMPETITION_LESSONS.md`](../device-board-scripts/USERCASE_COMPETITION_LESSONS.md) · skill `membrana-competition-packaging`.

---

## 1. Решение виртуальной команды (консенсус 2026-06-25)

| Роль | Позиция |
|------|---------|
| **Vesnin (Teamlead)** | Operator debug — **обязательная** фаза packaging, не «по желанию». Закрытие sprint без `OPERATOR_DEBUG_LOG.md` с тремя fork — только с явным waiver в `GATE.md`. Уроки нового **класса** — в глобальный дневник L13+; повтор L1–L12 — ссылка, не дублирование. |
| **Ozhegov (Структурщик)** | Два реестра: **сессионный** (конкретный sprint + fork + commit) и **нормативный** (L-уроки в `USERCASE_COMPETITION_LESSONS.md`). Машинный индекс `competition-operator-findings-registry.json` — для RAG и `yarn logs:parse` cross-ref. |
| **Dynin (Математик)** | Симптомы с числами: `frameRefCount`, tick#, `drone-skip` — копировать из `yarn logs:parse`, не пересказывать. |
| **Kuryokhin (Музыкант)** | Smoke критерий async v2: `smoke v2.0-async: PASS`, Run ≥60s, mic device. Отдельно фиксировать async-специфику (StartAsyncJob, detached report). |
| **Rodchenko (Верстальщик)** | Operator path: picker → Apply → Run; entitlement `community` / badge Sprint — проверять до blame runtime. |

**LGTM:** двухуровневый реестр + последовательный проход fork'ов + обязательная карточка находки.

---

## 2. Когда применять

| Момент | Действие |
|--------|----------|
| После Phase A (`comp:publish-catalog`) | Создать `OPERATOR_DEBUG_LOG.md` в packaging sprint |
| Перед `yarn task:archive` packaging | Все fork в логе `PASS` или `WAIVED` с обоснованием |
| Phase 1 **следующего** Competition Sprint | Команды читают L1–L12 + новые L13+ и релевантные `ODF-*` |

---

## 3. Два уровня реестра

### 3a. Сессионный лог (per packaging sprint)

**Путь:** `docs/competition-sprint/<packaging-sprint-id>/OPERATOR_DEBUG_LOG.md`

| Поле | Описание |
|------|----------|
| Порядок | Alpha → Beta → Gamma (или порядок из `CATALOG_PUBLISH.json`) |
| Статус fork | `pending` \| `in_progress` \| `pass` \| `blocked` \| `waived` |
| Карточки находок | `ODF-<sprint-short>-<fork>-<nnn>` |

**Правило:** не переходить к следующему fork, пока текущий не `pass` или не зафиксирован `blocked` + handoff.

### 3b. Глобальные уроки (классы ошибок)

**Путь:** [`docs/device-board-scripts/USERCASE_COMPETITION_LESSONS.md`](../device-board-scripts/USERCASE_COMPETITION_LESSONS.md)

| Когда писать новый L13+ | Когда достаточно ссылки |
|-------------------------|-------------------------|
| Новый **класс** сбоя (другой root cause) | Тот же L9–L12, другой fork |
| Новый fix в runtime / pack / hydrate | Косметика title/copy |

Формат урока — как L1–L12: **Симптом** → **Что** → **Fix** → **Профилактика** (чеклист).

### 3c. Машинный индекс (cross-sprint)

**Путь:** [`docs/device-board-scripts/competition-operator-findings-registry.json`](../device-board-scripts/competition-operator-findings-registry.json)

Одна запись на карточку находки. Агент добавляет JSON при закрытии карточки; `lessonId` связывает с L-уроком.

---

## 4. Карточка находки (обязательные поля)

```markdown
### ODF-<short>-<fork>-<nnn>

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-beta-async-v2` |
| **status** | `open` \| `resolved` \| `wontfix` |
| **lesson** | `L13` (новый) или `L11` (повтор) |
| **symptom** | Точная строка из лога / UI |
| **root cause** | 1–3 предложения |
| **fix** | Файлы + что изменили |
| **prevention** | Что команда **следующего** sprint делает в Phase 1 CONCEPT |
| **commit** | SHA или `pending` |
```

**Definition of Done карточки:** `status: resolved`, fix в коде или docs, `lesson` обновлён, запись в JSON registry.

---

## 5. Operator workflow (последовательно)

```bash
# Подготовка
yarn workspace @membrana/client dev

# На каждый fork (по очереди):
# 1. UserCase list → Apply fork
# 2. Run ≥60s (mic)
# 3. Сохранить лог → logs/apps/client/logs.txt
yarn logs:parse

# После PASS — следующий fork
# После FAIL — карточка ODF, fix, rebuild если нужно:
yarn usercase:build-competition-async-v2-all   # sprint-specific
yarn comp:publish-catalog --id <parent-sprint-id>
```

### Критерии PASS (async v2)

| Check | Ожидание |
|-------|----------|
| `smoke v2.0-async` | PASS |
| `drone-skip` | 0 (или объяснён waiver) |
| Run duration | ≥60s |
| Pre-run | green до Run |

---

## 6. Обязанности агента при Phase C

1. Вести `OPERATOR_DEBUG_LOG.md` в реальном времени (не «в конце спринта»).
2. При новом классе ошибки — **сначала** черновик L13+ в lessons, **потом** fix.
3. Append `competition-operator-findings-registry.json` (не редактировать старые записи).
4. Commit pattern: `fix(comp-packaging/<fork>): ODF-… — <кратко>` + `docs(comp-packaging): ODF card + L13`.
5. Обновить `PITCH_LOG.md` packaging sprint при закрытии Phase C.

---

## 7. Закрытие Phase C

| # | Критерий |
|---|----------|
| C1 | Три fork в `OPERATOR_DEBUG_LOG.md` → `pass` или documented `waived` |
| C2 | Все `ODF-*` → `resolved` или `wontfix` |
| C3 | Новые L13+ в lessons (если были) |
| C4 | `competition-operator-findings-registry.json` синхронизирован |
| C5 | `GATE.md` — operator checklist отмечен |

Затем: `yarn task:archive comp-packaging-catalog-2026-06-25`.

---

## 8. Связь со следующим Competition Sprint

| Документ | Обязательное чтение |
|----------|---------------------|
| `USERCASE_COMPETITION_LESSONS.md` | Phase 0 generation — **все** L1–L12 + L13+ |
| `OPERATOR_DEBUG_LOG.md` прошлого packaging | Прецеденты fork-specific |
| `competition-operator-findings-registry.json` | Поиск по `forkId` / `tags` |
| `COMPETITION_*_DESIGN_SYNTHESIS.md` | Продуктовый контекст, не RCA |

В **CONCEPT.md** Phase 1 каждая команда добавляет раздел:

```markdown
## Lessons applied (L* / ODF-*)
- L11: gate exec-false-out → …
- ODF-av2-beta-001: …
```

---

## 9. Шаблон OPERATOR_DEBUG_LOG.md

См. [`comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md`](../competition-sprint/comp-packaging-catalog-2026-06-25/OPERATOR_DEBUG_LOG.md).

---

*LGTM Vesnin · 2026-06-25 · Phase C packaging `comp-packaging-catalog-2026-06-25`*
