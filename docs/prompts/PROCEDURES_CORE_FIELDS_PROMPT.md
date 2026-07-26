# Task prompt: procedures-core-fields (Ф1 #1220)

| Поле | Значение |
|------|----------|
| `id` | `procedures-core-fields` |
| `size` | M |
| `githubIssue` | [#1220](https://github.com/officefish/Membrana/issues/1220) (эпик, фаза Ф1) |
| `parentEpic` | — (сам эпик; фаза без отдельного child-issue) |
| Канон дня | [`docs/MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) |

## Промпт целиком

Универсальное ядро настроек процедуры: три поля `trigger` · `steps` · `gates`,
гарантированные каждой процедурой. Контракт — [`docs/procedures/CORE.md`](../procedures/CORE.md).
Форму шагов брать из `docs/tasks/evening-ritual-steps.json`, не изобретать.
У каждого обязательного поля — легальное «нет» с честной причиной (#1219).
Заполнить ядро на трёх пилотах: `ritual-evening`, `bridge`, `ritual-dreams`.
Зуб: нет ядра → finding; частичное/битое → отказ; пилоты обязаны нести полное ядро.

## Out of scope

- `mode` / `home` (Ф2), лицензия парсера (Ф3), миграции (Ф4), заполнение всех 19 (Ф5)
- Оркестрация n8n (`insight-procedures-orchestration-n8n`)
- Перенос `evening-ritual-steps.json` внутрь контейнера (остаётся `ref`)

## Acceptance

- [ ] `docs/procedures/CORE.md` описывает контракт и легальное «нет»
- [ ] `validate-procedure.mjs` принимает ключи ядра; частичное → дефект; none → finding
- [ ] Три пилота заполнены честно; `node --test scripts/validate-procedure.test.mjs` зелёный
- [ ] README слоя и трёх пилотов ссылаются на ядро
