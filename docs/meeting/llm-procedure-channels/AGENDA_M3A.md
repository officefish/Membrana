# M3a — повестка: шов с `.env.llm-proxy` / experimental

> M3a · кандидат 6 · зависит от C1 · параллельно T1/F1 · secretary

## **X1 — Как стыкуется experimental llm-proxy с ритуальным контуром каналов?**

Поглотить в ритуал, оставить рядом только для ask/smoke, или deprecated для всего
кроме ключей OpenRouter. Секреты vs маршрут уже разведены C1.

### Кандидаты (текст)

1. Ритуал читает те же ключи/провайдеры, что `scripts/experimental/llm-providers.json`; `.env.llm-proxy` — канон секретов OpenRouter/FreeModel.
2. Ритуал получает свой thin-registry провайдеров в `scripts/lib/`; experimental остаётся песочницей; ключи можно шарить файлом, но код не импортирует experimental из ritual.
3. `.env.llm-proxy` deprecated; всё в корневой `.env` с префиксами; experimental удалить из skill «не для ритуала».
4. FreeModel отдельно от OpenRouter политикой; только OpenRouter в v1 ритуала.

### Форма вердикта + **список посылок обязателен.**
Запреты: не схему телеметрии; не UI; не список fallback-цепочки (только шов ключей/кода).
