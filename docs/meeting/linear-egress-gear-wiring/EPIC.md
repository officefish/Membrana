# Эпик: egress Linear + боевая подводка движка задач

> Заседание `linear-egress-gear-wiring` · 2026-07-20 · **все узлы DAG закрыты**
> [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)
> PR: https://github.com/officefish/Membrana/pull/690

---

## Сборка вердиктов

| Фаза | Узел | Вердикт | Протокол |
|---|---|---|---|
| M0 | порядок | `К1 ∥ К4a → К2 → К3 → {К5, К4b}` · ratified владельцем | [m0](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | К1 egress | media-NL = GraphQL-клиент + pull; office = потребитель `linear-snapshot@1` | [m1](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | К4a каркас | `yarn task:start` (Issue∧биекция∧acceptance∧stub∧leadPersona); AGENTS→паспорт; Issue/registry/Linear | [m1b](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| M2 | К2 trust | `LINEAR_API_KEY` только media; egress только media; trigger office→media = `X-Membrana-Token` | [m2](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) |
| M3 | К3 снимок | honest-шапка с `producedBy`/`egressRegion`; `pullOk(S)` от файла; гейт офлайн | [m3](../../seanses/linear-egress-gear-wiring-m3-snapshot-dod-2026-07-20.md) |
| M4 | К5 stub | снятие при первом `pullOk` не-stub; явный `movementMode`+`snapshotRef`; silent-flip запрещён | [m4](../../seanses/linear-egress-gear-wiring-m4-stub-lift-2026-07-20.md) |
| M4b | К4b closure | `pullOk`∧`present`∧`issueClosed@headRev`∧`acceptedBy`; digest опционален; коды 10/20/22/23 | [m4b](../../seanses/linear-egress-gear-wiring-m4b-closure-gate-2026-07-20.md) |

---

## Порядок исполнения (закон)

```
К1 ✓          К4a ✓
 │
 ▼
К2 ✓
 │
 ▼
К3 ✓
 │
 ├→ К5 ✓
 └→ К4b ✓
```

---

## Работы (что реализовывать после заседания)

1. **Тракт egress:** клиент Linear + batch pull на media-NL; office без GraphQL Linear;
   доставка артефакта; снять `LINEAR_API_KEY` / исходящий Linear из env-модели office.
2. **Снимок `@1`:** мигрировать `LinearSnapshotHeader` (`producedBy`/`mode` вместо
   `office-batch`); реализовать `pullOk`; freshness вне тела гейта.
3. **Процедуры:** `yarn task:start`; гейт active без Issue; посев AGENTS/lifecycle;
   override MAIN_DAY.
4. **Режимы:** флаг `movementMode` + явный switch после первого live `pullOk`;
   closure-гейт с кодами 10/20/22/23 (проверить занятость 22 в паспорте §5).

---

## Гейты владельца

| Что | Статус |
|---|---|
| Порядок M0 | ratified 2026-07-20 |
| Merge PR #690 | **ждёт слова владельца** |
| Раскладка секретов / туннель / первый live pull в прод | вне заседания |
| Аудит процедуры | отдельный агент: `yarn meeting:audit --id linear-egress-gear-wiring` |

---

## Итог председателя

Заседание по содержанию **готово к закрытию**: все узлы DAG имеют вердикт с посылками.
Merge docs-PR и закрытие карточки — только по слову владельца. Аудитор — не председатель.
