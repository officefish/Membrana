# Task prompt: procedures-homes (Ф2 #1220)

| Поле | Значение |
|------|----------|
| `id` | `procedures-homes` |
| `size` | M |
| `githubIssue` | [#1259](https://github.com/officefish/Membrana/issues/1259) (фаза Ф2 эпика [#1220](https://github.com/officefish/Membrana/issues/1220)) |
| Канон | [`docs/procedures/HOME.md`](../procedures/HOME.md) |

## Промпт целиком

Легализация домов процедур: поле `home` (ссылка + форма + writers) и `mode`
(orchestrated|mirrored|local). Кит ≠ дом. Зуб в обе стороны: объявленный дом
обязан существовать; живой дом без декларации — находка (`docs/bridge` с 22.07).
Пилоты: bridge объявляет дом; evening/dreams — честное `none`.

## Out of scope

- Ф3 лицензия парсера, Ф4 версии/миграции формы, Ф5 заполнение всех 19
- Оркестрация n8n; полный зуб «extension не override» по содержимому

## Acceptance

- [x] `docs/procedures/HOME.md` + форма `docs/bridge/HOME.form.json`
- [x] `validate-procedure`: `home`/`mode` в схеме; `auditProcedureHomes`
- [x] Три пилота несут `home`+`mode`; тесты зелёные; пин кита обновлён
