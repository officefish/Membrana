# Task prompt: procedures-license (Ф3 #1220)

| Поле | Значение |
|------|----------|
| `id` | `procedures-license` |
| `size` | M |
| `githubIssue` | [#1268](https://github.com/officefish/Membrana/issues/1268) (фаза Ф3 эпика [#1220](https://github.com/officefish/Membrana/issues/1220)) |
| Канон | [`docs/procedures/LICENSE.md`](../procedures/LICENSE.md) |
| Родня | срез [#1227](https://github.com/officefish/Membrana/issues/1227) |

## Промпт целиком

Лицензия контракта в процедурном слое: prose vs contract; парсер выдаёт
лицензию (происхождение ∧ соответствие); версия парсера на штампе; пилоты
VOCABULARY.md и REGISTRY.md; зуб `yarn procedures:license --check`.
Не разворачивать #1227 на весь репозиторий.

## Acceptance

- [x] LICENSE.md + contracts.registry.json + rootOfTrust
- [x] procedure-contract-license (+ stamp) + CLI
- [x] генераторы пишут parser@штамп; --check зелёный
