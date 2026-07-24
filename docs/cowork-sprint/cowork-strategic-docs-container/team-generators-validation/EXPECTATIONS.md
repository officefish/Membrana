<!-- Cowork block generators-validation · Phase 1 · via xai/grok-4.5 (оркестровка), изоляция соблюдена -->

# Односторонние ожидания (допущения блока generators-validation)

## От canon-data

1. **Шаблон** — объект с полями минимум: `id: string`, `version: string`, `slots: Array<{ granuleId: string, version: string, pin?: object }>`, опционально `meta: object`. Сериализуем в JSON для office.
2. **Гранула в индексе** — дискриминатор `kind: "literal" | "fn"`; literal несёт `body: string`; fn несёт координаты чистого экспорта (`exportName`, резолв модуля/реестра). Версии — строки, pin-совместимые с нашим `invokeGranuleFn(..., pin, io)`.
3. **Предикат valid (канонический)** — если office недоступен, мы допускаем, что сосед позже отдаст `isValidTemplate(template) → boolean | { ok, reasons }`. На Phase 1 **не зависим**: валидность = ответ нашего office-стаба/`validateViaOffice`. Ожидаем, что канонический предикат будет **согласован** с office (один смысл `ok`).
4. **Индекс** — duck-type `resolve(id, version) → Granule | undefined`; отсутствие = ошибка резолва, не «пустой literal».
5. Канон **не** пишет в `releases/`/`experiments/` сам; только данные для generate.

## От engine-renderer

1. Рендер тела — функция вида `(parts: string[], ctx: { template, slots, materialized }) => string` (sync или async). Мы передаём её в `opts.renderBody`.
2. **Части** уже материализованы генератором (literal body / fn output.body) **в порядке `template.slots`**. Renderer **не** исполняет гранулы-fn и **не** ходит в I/O.
3. Выход renderer — **строка `body`** целиком (markdown/plain — безразлично генератору); генератор не парсит структуру body кроме передачи в validate.
4. На Phase 1, пока соседа нет, используем стаб `parts.join("\n---\n")`. Ожидаем, что production-renderer сохранит детерминизм: те же parts+ctx → тот же body.
5. Renderer **не** решает маршрут release/experiment и **не** зовёт office.

## Общее

- Соседи не импортируют наши edge-write; мы не импортируем их код в Phase 1.
- Сведение схемы гранулы/шаблона — на Интерфейс-консилиуме; выше — рабочие допущения, не контракт.
