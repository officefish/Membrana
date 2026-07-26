# Task prompt: procedures-corpus (Ф5 #1220)

| Поле | Значение |
|------|----------|
| `id` | `procedures-corpus` |
| `size` | M |
| `githubIssue` | [#1284](https://github.com/officefish/Membrana/issues/1284) (фаза Ф5 эпика [#1220](https://github.com/officefish/Membrana/issues/1220)) |
| Канон | [`docs/procedures/CORPUS.md`](../procedures/CORPUS.md) |
| Родня | [#1212](https://github.com/officefish/Membrana/issues/1212) скиллы; [#1219](https://github.com/officefish/Membrana/issues/1219) легальное «нет» |

## Промпт целиком

Ревизия корпуса процедур: заполнить ядро и home/mode у всех built; по восьми
`declared-not-built` — вердикт keep (не снимать); живой path-дом только мостик;
тонкий срез скиллов↔процедуры; проход `gates` без заглушек. Без n8n.

## Acceptance

- [x] CORPUS.md — инвентарь 19 + вердикты declared + срез скиллов
- [x] Ядро + home/mode у всех 11 built; morning-ritual-steps несёт criticality
- [x] auditProcedureCorpus + тесты; validateProcedure зелёный
- [x] kits pins обновлены при смене validate-procedure.mjs
