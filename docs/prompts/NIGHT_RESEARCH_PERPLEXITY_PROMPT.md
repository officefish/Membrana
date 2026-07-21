# Промпт: S6 night:research: живой Perplexity (сон checked/void)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — провод Perplexity в `yarn night:research`.
> Реестр: `id` = `night-research-perplexity` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Linear: [DRU-199](https://linear.app/techies68/issue/DRU-199).

---

## Контекст

Эпик #592 / DRU-196: генератор стратегии дня. S6 формулирует «сон системы» (пара derived-кристаллов → вопрос), но **не проверяет** его снаружи: раздел «Результат проверки сна» пуст, `status: pending` навсегда. 17.07 сон догнали руками через Perplexity (`status: checked`) — провод есть, он просто не кинут (#598).

Не путать с **ritual-d-dreams / DRU-223** (сны v2, соревнование 24→6) — другой контур.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |
| Issue [#598](https://github.com/officefish/Membrana/issues/598) | AC и доказательство руками |

**Референс:** `scripts/lib/insight-ritual.mjs` → `perplexityAsk`; ручной прогон `d6f9dd92`.

**GitHub Issue:** [#598](https://github.com/officefish/Membrana/issues/598)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. `yarn night:research` после `pickTopic` (если вопрос не `rejected`) шлёт запрос в Perplexity (`sonar` через существующий `perplexityAsk` + proxy).
2. Заполняет раздел **«Результат проверки сна»** ответом.
3. Ставит `status: checked` при находке, `status: void` при честном «снаружи пусто».
4. Без ключа / `--dry-run` — пишет артефакт с `pending` и видимой пометкой, не падает и не врёт `void`.
5. Ошибка API — `pending` + заметка в разделе результата (не маскировать под void).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Ядро | `scripts/lib/night-research.mjs` | `classifyDreamAnswer`, `renderNightArtifact(…, check)` |
| CLI | `scripts/night-research.mjs` | `loadDotEnv`, вызов `perplexityAsk`, запись файла |
| Тесты | `scripts/night-research.test.mjs` | checked/void/pending без сети |

**Статусы:** `pending` | `checked` | `void` | `adopted` | `rejected`.  
`adopted` — только владельческий гейт. `checked` не входит в знаменатель `nightYield`. `pending` по TTL → `void` (уже есть).

**Запрещено:**

- Трогать ritual-d-dreams / `dreams-select.mjs`.
- Ставить `adopted` из контура.
- Писать новый fetch-клиент — только `perplexityAsk`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| `classifyDreamAnswer` | empty / looksUnanswered → void; содержательный → checked |
| `renderNightArtifact` | status + тело раздела для checked/void/pending |
| CLI offline | `--dry-run` / нет ключа не зовёт сеть |

---

### Definition of Done

- [ ] Живой/смоук прогон с ключом пишет `checked` или честный `void` (не пустой pending).
- [ ] Тесты зелёные: `node --test scripts/night-research.test.mjs`.
- [ ] PR с `Closes #598`; Linear DRU-199 → Done после merge.
- [ ] LGTM Teamlead.

---

### Порядок работы

1. План → код ядра → CLI → тесты → smoke.
2. Не расширять scope на jargon-guard (#599 уже CLOSED).

---

## Заметки для человека-постановщика

- Linear sync: `linearId: DRU-199` в registry.
- После merge: `yarn task:archive night-research-perplexity --notes "PR #N"`.
