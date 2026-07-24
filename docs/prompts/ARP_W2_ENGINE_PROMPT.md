# Промпт: W2 — движок атласа (home / role / plane)

> **M** · `arp-w2-engine` · [#1100](https://github.com/officefish/Membrana/issues/1100) · parent `atlas-report-plane` · lead **ozhegov**  
> Код: `scripts/lib/tooling-atlas.mjs` (+ тесты рядом). Пакет: tooling / scripts.

## Промпт целиком

### Контракт строки контейнера

Расширить `discoverContainers` (или производный view):

| Поле | Правило |
|------|---------|
| `home` | каталог манифеста (уже есть) — **канон ссылки** в ATLAS/Mintlify |
| `worksOn` | как в манифесте (файл или подпуть) — колонка «работает над», не id строки |
| `role` | из манифеста: `primary` \| `derivative` \| `null` |
| `plane` | `report` если `home` под `docs/audit/`; `meta` если tooling-atlas; иначе `domain` |
| `family` | сохранить совместимость или заменить отображение на `plane` + уточнение; не ломать `--decompose --by family` без миграции тестов |

### Render

- Колонка/якорь ссылки = **`home`**, не `worksOn`.
- Показать `role` и `plane` (таблица ATLAS + MDX).
- Для `plane=report`: в `--decompose` / секции индекса сгруппировать под «плоскость отчётов `docs/audit`», слоты — дети (git, tasks, bestiary, llm-calls), не смешивать визуально с `docs/tasks`.

### Тесты

- `docs/audit/tasks` и `docs/tasks` — разные `home`, разные `plane`/`role`.
- Ссылка в сгенерированном ATLAS содержит `docs/audit/tasks`, **не** оканчивается на `registry/` как единственный идентификатор.
- Идемпотентность `--render` / `--check` сохранена.

## DoD

- [x] Engine + unit-тесты зелёные (14/14)
- [x] R2–R4 соблюдены; ссылки по `home`; role/plane в индексе
- [x] Не включать `scripts/` в discover без манифеста
