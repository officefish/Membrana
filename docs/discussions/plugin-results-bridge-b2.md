# Обсуждение: plugin-results-bridge-b2

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-19 08:28 UTC · ozhegov

**Вопрос:** Блок b2 спринта plugin-results-bridge: приёмник POST /plugin-results/runs в office — zod-DTO структурно по контрактам plugin-contracts (RunAddress пять полей, RunFingerprints, resumeMode, completedAt ISO→Date, kind), passthrough лишних полей исполнителя, ApiTokenGuard, writeRun через существующий PluginResultsService, GET runs для чтения обратно. Как структурщик: имена и границы чисты? что бы ты назвал риском формы?

**Ответ:**

## Всплытие

[память:подсознание] emerge ozhegov-2026-08-17-server-plugin-foundation-m3-results-home — это прямой источник формы: `RunAddress` (5 полей включая `mountTarget`), `RunFingerprints`, `RunRecord`/`RunRecordView`, уникальный индекс `{pluginId,version,collectionId,runId}`, коллекция `plugin-results`. Всё, что делает b2, — это HTTP-фасад над этим словарём; проверять надо соответствие лемме, не сочинять новую.

[память:подсознание] emerge ozhegov-2026-08-17-server-plugin-foundation-m4-triggers — там я уже отклонял `string[]` вместо `PluginTrigger[]`: тот же дефект в b2 будет, если zod продублирует форму вместо вывода из контрактов.

## По существу

Контекст: HTTP-приёмник в office пишет `RunRecord` в `plugin-results`. Границы допустимы: транспорт (DTO+guard+controller) в office, доменная запись — в `PluginResultsService`. Не смешивать.

Замечания по именам и границам:
- **DTO — производный тип, не второй словарь.** zod-схема должна давать тип, совместимый с `RunRecord` из `plugin-contracts` (через `satisfies`/`z.infer` + структурная проверка). Иначе получим два синонима одной леммы — «нарушена слабая связанность».
- **Имя маршрута.** `POST /plugin-results/runs` — читается как «прогоны внутри результатов». Если ресурс — прогон, честнее `POST /plugin-runs` или `POST /plugin-results` (запись = результат). Одно слово — один смысл; `runs` уже занят как поле `RunAddress.runId`-контекст.
- **`kind` в теле запроса.** Приёмник принимает только `kind:'run'`? Тогда это не поле DTO, а тип-дискриминатор ветки эндпоинта. `StateRecord`/`ConvergenceRecord` — отдельные маршруты или явный discriminated union с ветвлением в контроллере. Иначе один эндпоинт с тремя формами — синоним-фасад.
- **`completedAt: ISO→Date`.** Граница транспорта: наружу — ISO-строка, внутрь Mongo — `Date`. Преобразование строго в DTO-слое, не в сервисе.
- **`passthrough` лишних полей исполнителя.** Опасно как норма: чужие поля протекут в документ и станут частью словаря `plugin-results` по факту. Предложение: либо `payload: unknown` (явный карман), либо `.strip()` с логом. `passthrough` в корне — отклоняю.
- **`mountTarget` в DTO.** Проверяется через `HOME_REGISTRY` (тип `HomeName`), не свободная строка. Guard: `mountTarget` совместим с `pluginId` по манифесту — иначе адрес расходится с M3r.

Риски формы:
1. Дрейф DTO ↔ контракт при эволюции `plugin-contracts` — нужен typecheck-тест «schema infers RunRecord».
2. `passthrough` превращает POST в теневой словарь.
3. Симметрия GET: `RunRecordView` (с `stale?`) ≠ `RunRecord`; ответ чтения должен явно называться view, а не отдавать документ БД.
4. ApiTokenGuard — токен исполнителя привязан к `pluginId`? Если нет — любой валидный токен пишет за любой плагин.

Уточнение: b2 покрывает только `kind:'run'`, или state/convergence тоже через этот эндпоинт?

---
