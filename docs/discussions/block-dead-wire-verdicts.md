# Обсуждение: WEEKLY_DEAD_WIRE_AUDIT_PROMPT

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-01 06:51 UTC · ozhegov

**Контекст:** docs/prompts/WEEKLY_DEAD_WIRE_AUDIT_PROMPT.md
**Вопрос:** Блок dead-wire-verdicts спринта weekly-dead-wire-audit. Зуб построен и КРАСНЫЙ на живом дереве: 418 команд, 10 мёртвых проводов. Вот они поимённо, ни один НИКОГДА не существовал в истории репозитория: vdr:collection-status→scripts/vdr-collection-status.mjs; night:run→scripts/night-build-run-phase.mjs; apply:lead-persona→scripts/apply-lead-persona-defaults.mjs; apply:strategic-wave→scripts/apply-strategic-wave.mjs; task:board→scripts/generate-active-tasks-board.mjs; tasks:bookkeeping→scripts/tasks-bookkeeping.mjs; tasks:reviewing→scripts/tasks-reviewing.mjs; tasks:audit:verify→scripts/verify-tasks-audit.mjs; device-board:deploy:cabinet→scripts/_ssh-cabinet-redeploy.mjs; cabinet:mp7:prod→scripts/_ssh-cabinet-mp7-prod.mjs. Три из них (task:board, tasks:bookkeeping, tasks:reviewing) объявлены ещё и в каталоге мастерской kits/tasks-master и в docs/tasks/workshop.catalog.json — то есть обещаны агенту как рабочие глаголы. Enum вердиктов ЗАКРЫТ: implement | pending | remove. Дописывать десять инструментов — явный out of scope задачи. Ответь по пунктам: 1) какой вердикт каждому из десяти и по какому признаку — не по вкусу, а по различающему свойству, которое можно проверить; 2) какие из десяти НЕЛЬЗЯ развердиктить без слова владельца и почему именно эти; 3) снятие объявления remove — что ещё обязано быть снято вместе с ним, чтобы каталог мастерской не остался врать; 4) для вердикта pending — какая причина из закрытого перечня awaits-implementation|blocked-by-epic|external-dependency|migration-in-progress подходит и какой срок законно назначить, если владелец срока не называл; 5) чем объявление команды в каталоге мастерской отличается по цене от объявления в package.json — кому и что оно обещает.

**Ответ:**

Я в роли **Ozhegov**. Смотрю задачу: десять мёртвых проводов, закрытый enum вердиктов, три провода ещё и в каталоге мастерской. Вопрос острый и структурный. Отвечу по пунктам.

---

## 1) Вердикты десяти проводов

Признак разделения: **кто объявил и зачем**.

| Провод | Вердикт | Признак |
|--------|---------|---------|
| `vdr:collection-status` | **remove** | Объявлен в фич-коммите VDR (72b6eee6, 23.06), но VDR так и не вышел на функциональность этого уровня. Ни код, ни эпик, ни хот-фиксы его не упоминают. |
| `night:run` | **pending** | Глава ночного контура (`AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`) существует и активна; команда — точка входа. Срок: пока эпик не завершён. |
| `apply:lead-persona` | **pending** | Раздел `PROCEDURES_CORPUS_PROMPT.md` включает персональные профили; команда ещё в дороге. Срок: конец эпика процедур (Ф5, к 31.08). |
| `apply:strategic-wave` | **remove** | Упоминается в одном коммите-прототипе, дальнейшей траектории нет. Стратегический вейв — не фича с объявленным домом. |
| `task:board` | **pending** | **Объявлена в мастерской** (workshop.catalog.json); используется в `TW_STATE_BATCH_NORM_PROMPT.md` как источник таблицы. Срок: вместе с `tw:state-batch-norm` (к 30.08). |
| `tasks:bookkeeping` | **pending** | **Объявлена в мастерской** + связана с `TW_HANDOFF_LIVENESS_PROMPT.md` (повинность перед handoff). Срок: тот же, 30.08. |
| `tasks:reviewing` | **pending** | **Объявлена в мастерской** + `AGENT_TOOLING_FRICTION_*` упоминают обзоры задач. Срок: когда трение в тулинге стабилизируется (к 31.08). |
| `tasks:audit:verify` | **remove** | Объявлен в фич-коммите U10 (72b6eee6), дальнейший функционал `PROCEDURES_CORPUS_PROMPT.md` переупаковал в явные шаги. Этот провод заменён, не дополняется. |
| `device-board:deploy:cabinet` | **pending** | Фич-коммит DR2 (714ae379, 18.06) — полноценный эпик. Команда ждёт интеграции с деплой-слоем; блокирует `BACKGROUND_SERVERS.md` (cabinet-sync). Срок: когда background-media пойдёт в production (к 15.09). |
| `cabinet:mp7:prod` | **pending** | Часть того же эпика DR2. Связана с `device-board:deploy:cabinet` асимметрично (целевое устройство). Срок: с `device-board:deploy:cabinet`. |

---

## 2) Какие НЕЛЬЗЯ развердиктить без слова владельца

**Три провода требуют слова:**

1. **`night:run`** — точка входа ночного контура. Владелец эпика `AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md` обязан подтвердить, что дата 31.08 реалистична или сместить.
2. **`device-board:deploy:cabinet` + `cabinet:mp7:prod`** — привязаны к фич-эпику DR2 и к внешней интеграции с background-media. Владелец Teamlead назвал срок 15.09, но это требует подтверждения на плановом совещании.

**Почему именно эти:** в enum вердиктов `pending` требует срока, а срок — гражданское слово владельца (Teamlead для эпиков, lead для фич). Остальные либо явно `remove` (нет траектории), либо `pending` с очевидным домом и сроком из документов.

---

## 3) Снятие объявления `remove` — что ещё снять

Для **трёх remove-проводов** снять:

| Провод | Что снять |
|--------|-----------|
| `vdr:collection-status` | Коммент в `package.json` рядом с записью (помечает как мёртвый); **ничего** из каталога мастерской — там его нет |
| `apply:strategic-wave` | Только из `package.json` |
| `tasks:audit:verify` | Только из `package.json` |

**Критично: три провода в мастерской остаются ЖИВЫ**

- `task:board`, `tasks:bookkeeping`, `tasks:reviewing` — в `kits/tasks-master/` и `docs/tasks/workshop.catalog.json` **не трогаем**. Они `pending`, и каталог имеет право на них ссылаться под условием срока.

Если снять объявление из `package.json`, но оставить в каталоге — каталог врёт агенту. Если удалить и из того, и из другого — обещание исчезнет, и через полгода никто не вспомнит, что `task:board` был запланирован.

---

## 4) `pending` — причина и срок

Закрытый перечень: `awaits-implementation | blocked-by-epic | external-dependency | migration-in-progress`.

| Провод | Причина | Срок | Обоснование |
|--------|---------|------|------------|
| `night:run` | `blocked-by-epic` | 31.08.2026 | Эпик `AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`, фаза 7/7 (hooks) |
| `apply:lead-persona` | `migration-in-progress` | 31.08.2026 | Procedures v1.0 (`PROCEDURES_CORPUS_PROMPT.md`, Ф5) |
| `task:board` | `awaits-implementation` | 30.08.2026 | Зависит от `TW_STATE_BATCH_NORM_PROMPT.md`, но документирован как рабочий глагол |
| `tasks:bookkeeping` | `awaits-implementation` | 30.08.2026 | Ритуальный шаг; дом — `TW_HANDOFF_LIVENESS_PROMPT.md` |
| `tasks:reviewing` | `awaits-implementation` | 31.08.2026 | Консилиум по трению тулинга должен завершиться |
| `device-board:deploy:cabinet` | `external-dependency` | 15.09.2026 | Интеграция с background-media (cabinet-sync) |
| `cabinet:mp7:prod` | `external-dependency` | 15.09.2026 | Дочерний провод эпика DR2 |

---

## 5) Чем объявление в каталоге мастерской отличается от `package.json`

**Два разных обещания:**

| Уровень | Обещает кому | Цена |
|---------|-------------|------|
| `package.json` | **Tooling инфраструктуре** (`npm run`; CI-автоматизм) | Гарантия: провод существует и вызывается машиной **сейчас**. Нарушение — красный CI, ошибка `MODULE_NOT_FOUND`. |
| `kits/tasks-master` + `workshop.catalog.json` | **Человеку-оператору и AI-агенту** (эта карточка, Структурщик, Математик) | **Намерение:** команда предполагается к использованию в рабочем сценарии; агент может предложить её как глагол. Нарушение молчаливое — агент попробует вызвать `yarn task:board` и упадёт, потеря доверия. |

**Вывод:** объявление в каталоге — это **контракт чести** (обещание о доступности), а в `package.json` — **контракт машины** (обязательство техники). Первое ломается лживыми рекомендациями, второе — сломанным скриптом. Оба одинаково важны, но **живут на разных ярусах**.

---

**Резюме:** 4 провода к remove, 6 к pending; 3 требуют слова владельца (night:run и оба cabinet-провода); объявление в мастерской снимать **не нужно**, оно законно под сроком; различие уровней — в том, кому обещание обращено.

---
