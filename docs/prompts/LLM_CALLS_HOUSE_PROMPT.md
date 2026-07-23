# Промпт: Эпик — дом доказательств LLM-вызовов (LPC evidence house)

> **L** · `llm-calls-house` · [#1033](https://github.com/officefish/Membrana/issues/1033) · lead **vesnin** · craft **ozhegov**  
> Цепь: W0→W5 (`lch-w0-brief` … `lch-w5-closure` · #1034–#1039).  
> Семя: ратификация плана LPC evidence house владельцем 2026-07-23.  
> Дом: [`docs/audit/llm-calls/`](../audit/llm-calls/) (новый).  
> Паттерны: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) ·
> [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md) ·
> [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md) (thin mirror; pin F4 out).  
> Прецедент зеркала: `bestiary-workshop` W3 (#949/#967) · `branch-mintlify-engine` (#823).  
> Стык: LPC T1 ([M3b](../seanses/llm-procedure-channels-m3b-telemetry-2026-07-23-2026-07-23.md)) — расширение evidence minimum.  
> Инстанс: [`llm-calls-house-2026-07-23/OPEN.md`](../day-sprint/llm-calls-house-2026-07-23/OPEN.md).

---

## Контекст

Каналы LLM-процедур (LPC) уже дают panel + usage без тел запросов. Владелец
ратифицировал **официальный дом** для **доказательного минимума** вызовов:
достаточно подтвердить подлинность запроса и его параметры — не хранить полный
роман prompt/response. Mintlify публично зеркалит всё, что лежит в доме
(git = истина · Mintlify = монитор).

## Вердикты владельца

1. В доме — доказательный минимум (hash + параметры + мета), не сырые тела.
2. Всё содержимое дома можно светить на Mintlify (`docs.mmbrn.tech`).
3. Форма — GROUP_CONTAINERIZATION + HOME_WORKSHOP + thin Mintlify mirror.

## Инварианты (E1–E8)

1. **E1** Сырой `prompt` / `rawResponse` / ключи — никогда в git-доме, office usage, Mintlify.
2. **E2** Подлинность тел — `promptSha256` / `responseSha256` (+ bytes), считаются в памяти при emit.
3. **E3** Git = истина дома; Mintlify = монитор; дом не переезжает в `apps/docs`.
4. **E4** Office остаётся live SoT суток usage; git-дом — снимки/реестр для анализа.
5. **E5** Overlay каналов не живёт в этом доме (остаётся office LPC).
6. **E6** Гранула = один attempt (шаг chain), не «день» и не «процедура целиком».
7. **E7** Массовые мутации реестра — слово владельца (HARD GATE в AGENT_PROMPT).
8. **E8** Specimens/fixtures для зеркал — курируемые; не автодамп продакшена в Mintlify.

## Фазы

| Фаза | id | Lead | DoD |
|------|-----|------|-----|
| W0 | `lch-w0-brief` | vesnin | OPEN + Issues + ACTIVE + инварианты |
| W1 | `lch-w1-house` | ozhegov | Пять органов дома + провода паттернов |
| W2 | `lch-w2-workshop` | ozhegov | `workshop.manifest.json` + audit/decompose |
| W3 | `lch-w3-emit` | ozhegov | Schema/emit evidence + snapshot + tests |
| W4 | `lch-w4-mintlify` | ozhegov | Thin Mintlify + docs.json + specimens |
| W5 | `lch-w5-closure` | vesnin | CLOSURE + чеклисты GROUP + HOME_WORKSHOP |

## Out of scope (весь эпик v1)

- Полные тела prompt/response в git или office.
- Перенос overlay SoT в дом.
- Pin-манифест инструкций (#823 F4).
- Автопубликация каждой prod-гранулы в Mintlify без курации.

---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
