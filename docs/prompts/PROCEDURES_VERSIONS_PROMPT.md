# Task prompt: procedures-versions (Ф4 #1220)

| Поле | Значение |
|------|----------|
| `id` | `procedures-versions` |
| `size` | M |
| `githubIssue` | [#1274](https://github.com/officefish/Membrana/issues/1274) (фаза Ф4 эпика [#1220](https://github.com/officefish/Membrana/issues/1220)) |
| Канон | [`docs/procedures/VERSIONS.md`](../procedures/VERSIONS.md) |
| Родня | срез [#1227](https://github.com/officefish/Membrana/issues/1227); эпик [#1220](https://github.com/officefish/Membrana/issues/1220) |

## Промпт целиком

Версии, совместимость и миграции процедурного слоя: инвентарь пяти сущностей
(парсер · генератор · контракт · кит · форма дома); явное окно `compat[]`;
`formVersion` живёт в `*.form.json`; legacy-штамп и `version:1` формы —
дефект до миграции. Не разворачивать #1227 на весь репозиторий.

## Acceptance

- [x] VERSIONS.md — инвентарь + таблица миграций
- [x] HOME.form.json: formVersion + compat; HOME.md обновлён
- [x] migrateHomeForm / homeFormProblems + зуб в validateProcedure
- [x] migrateLegacyContractText; license --check валит legacy
- [x] тесты + procedures:license --check зелёный
