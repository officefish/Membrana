# Review нарезки: Harness + Product deploy

**Рецензент:** Тарасов  
**Спринт:** `harness-product-deploy-2026-08-02`  
**Вердикт:** LGTM после перерезки

## Что проверено

- Product уже находится в `origin/main`; Harness остаётся отдельной активной задачей.
- PR #1620 смешивает Product и Harness и не принимается целиком.
- Живой корпус содержит 13 мастерских и 23 процедуры.
- Генератор, мастерские и две транши процедур разведены в самостоятельные review-атомы.
- Production-деплой требует отдельных Mintlify roots, DNS/TLS evidence и визуальный smoke.
- `workflow-examples-marathon` получает не только JSON-запись, но и поддержанный kind,
  category map и focused test.

## Находки и решения

1. Первоначальный generator block превышал 400 строк: разделён.
2. Один page block не выдержал фактический корпус 36 объектов: разделён на три.
3. `marathon` отсутствовал в живом task-register enum: добавлен в scope до изменения.
4. Full script-suite потребовал обновить три производных kit pin и category map: пути
   добавлены в contract до исправления.

Scope результата не расширялся: отдельная Harness-документация, честный backlog
примеров и production-публикация двух Mintlify-проектов.
