# Closure: linear-egress-media-wiring

> След приёмки по LINEAR_TASKS_GEAR §4 / стабу `closure-artifact.example.md`.  
> Коммит/PR носителями следа не являются.

## Приёмка

| Поле | Значение |
|---|---|
| acceptedBy | `vesnin` |
| headRev | `a82fd5afec04dfa2605d77005eb0e684a2a5acd6` |
| acceptedAt | 2026-07-20 (Teamlead LGTM → owner «Разрешаю» merge+deploy) |

## Удостоверение / движение

| Поле | Значение |
|---|---|
| Центральная задача (GH) | [#691](https://github.com/officefish/Membrana/issues/691) |
| Реестр id | `linear-egress-media-wiring` — `status: archived` |
| PR | [#692](https://github.com/officefish/Membrana/pull/692) — MERGED |
| Linear movement | был stub `deferred-egress`; live snapshot path доказан (`pullOk`); явный stub-lift (К5) — follow-up |
| leadPersona (назначение) | `dynin` |
| Исполнитель | обезличенный субагент (в след не входит) |

## Live smoke (без секретов)

| Поле | Значение |
|---|---|
| Deploy SHA on media | `a82fd5af` |
| `LINEAR_API_KEY` in `/etc/membrana/media.env` | present |
| `POST …/v1/linear-snapshots/capture` (loopback) | HTTP 200, `pullOk=true` |
| `POST https://media.membrana.space/v1/linear-snapshots/capture` | HTTP 200, `pullOk=true` |
| Honest header | `producedBy=media-NL`, `egressRegion=NL`, `mode=batch-full-pull` |
| `recordCount` | 224 |

## Итог выхода

Producer `linear-snapshot@1` на media-NL; office — consumer/trigger через `X-Membrana-Token`; ключ Linear только в env media. Офлайн `pullOk` + контракт в репо; боевой pull с NL подтверждён.

## Ссылки

- Пилот: [`docs/discussions/linear-tasks-gear-pilot-egress-wiring-2026-07-20.md`](../../discussions/linear-tasks-gear-pilot-egress-wiring-2026-07-20.md)
- Контракт: [`docs/tasks/LINEAR_SNAPSHOT_CONTRACT.md`](../LINEAR_SNAPSHOT_CONTRACT.md)
- Архив-карточка: [`docs/tasks/archive/linear-egress-media-wiring.md`](../archive/linear-egress-media-wiring.md)
- Code-review: `docs/discussions/pr-692-code-review.md` (локальный артефакт ревью до merge)
