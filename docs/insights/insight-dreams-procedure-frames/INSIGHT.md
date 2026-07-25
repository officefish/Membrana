# INSIGHT: Ночные сны → процедура во фреймах с настраиваемым через панель провайдером

| Поле | Значение |
|------|----------|
| **ID** | `insight-dreams-procedure-frames` |
| **Статус** | draft |
| **Источник** | user |
| **Создан** | 2026-07-25 |

---

## Проблема / наблюдение

Ночные сны уже **частично процедура** (`docs/procedures/ritual-dreams/` — MANIFEST + README,
держатель dynin, кит `kits/dream-master`, скрипты `scripts/lib/dreams-*.mjs`, office-модуль
`DreamsModule` с маршрутами `/v1/dreams/{digest,tick,deliver}`, задеплоен 25.07). Но:

1. **Не разложена на фрейм-рельсы** — `ritual-dreams` не несёт `frames[]` по паттерну
   [`PROCEDURE_FRAMES`](../../patterns/PROCEDURE_FRAMES.md) (#1094), хотя паттерн ратифицирован и
   уже применён к `membrana-leveling`.
2. **Провайдер захардкожен** — `scripts/lib/dreams-providers.mjs`: статичная карта
   `DREAM_PROVIDER_ROUTES` (perplexity/grok/gemini → openrouter). Панель на выбор провайдера снов
   НЕ влияет. При этом панель **уже умеет** настраивать канал процедур: модуль
   `packages/background-office/src/modules/llm-channels/` (`llm-procedure-overlay.store.ts`) —
   ровно тот overlay, что 24.07 отдал консилиуму цепочку `anthropic→grok→openrouter`. Сны его не используют.

## Гипотеза

Если разложить `ritual-dreams` на фрейм-рельсы (#1094) и увести выбор провайдера снов с хардкода
на **существующий** panel-overlay `llm-channels` — получим: (а) оператор настраивает провайдера/модель
снов из панели без правки кода; (б) сны становятся эталонным носителем служебного фрейма «провода»
(живой вещдок отложенного заседания «фрейм проводов процедуры»); (в) единый механизм канала для всех
LLM-процедур (консилиум уже там), а не N хардкодов.

## Scope (черновик)

- **In scope:** frames[] у `ritual-dreams` (сюжетные = линия генерации сна; служебные = провода/
  времянки/доставка); провод провайдера снов через `llm-channels` overlay; панель-UX выбора провайдера снов.
- **Out of scope:** переписывание самой логики генерации снов; новый core-контракт (переиспользуем
  #1094 + llm-channels overlay — контракт НЕ вводим); формат dream-digest.

## Связи

- Паттерн: [`PROCEDURE_FRAMES`](../../patterns/PROCEDURE_FRAMES.md) (#1094, ратифицирован 24.07).
- Развилка шторма надёжности консилиума → отложенное заседание «фрейм проводов процедуры» (T1–T4):
  сны = первый конкретный носитель, как `membrana-leveling` был носителем паттерна фреймов.
- Инфра провайдера: `packages/background-office/src/modules/llm-channels/llm-procedure-overlay.store.ts`
  (панель), `scripts/lib/dreams-providers.mjs` (текущий хардкод), `scripts/lib/llm-procedure-*.mjs`.
- Процедура: [`docs/procedures/ritual-dreams/`](../../procedures/ritual-dreams/README.md), кит `kits/dream-master`.
- PR деплоя снов 25.07 (office редеплой) + tar-фикс #1192.

## Вопросы для research (Q1–Q3)

1. **Landscape:** как другие агент-платформы дают оператору настраивать LLM-провайдера per-workflow
   из UI (а не env/код) — паттерны provider-overlay, безопасность (кто может менять канал), аудит смены.
2. **Fit (Membrana):** как ложатся сюжетные/служебные фреймы на реальную линию снов (tick→select→
   generate→format→digest→deliver); переиспользуется ли `llm-channels` overlay снами один-в-один или
   нужна доменная надстройка; кто держатель фрейма «провода» снов (dynin vs тема каналов).
3. **Risk:** что ломается, если провайдер снов сменить из панели на лету (незавершённый tick,
   несовместимая модель); не тащит ли per-procedure overlay UI сложность, не окупаемую для одной процедуры.
