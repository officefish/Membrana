# CURRENT_TASK — неделя закрыта (2026-05-17)

> **Канон на следующую неделю:** [`STRATEGIC_PLAN_WEEK.md`](./STRATEGIC_PLAN_WEEK.md) (сгенерирован `yarn plan:week`).  
> **Вчерашнее ревью:** [`DAILY_CODE_REVIEW.md`](./DAILY_CODE_REVIEW.md) → архив `docs/archive/daily-code-review/`.

## Закрыто за неделю 2026-05-14 … 2026-05-17

| Блок | Статус |
|------|--------|
| Single-Node консилиум + scaffold 6 детекторов | ✅ |
| #45 harmonic service + demo + плагин | ✅ архив + Issue closed |
| Dataset v0.1 + `yarn benchmark:detectors` | ✅ |
| Merge в `main` | ✅ `45e8c5d` + ритуалы |
| Аудит #30 mic-plugin | ✅ [`issue-30-mic-plugin-audit-2026-05-17.md`](./discussions/issue-30-mic-plugin-audit-2026-05-17.md) |
| Вечер: `archive:daily-day`, `code-review`, `plan:week` | ✅ 2026-05-17 |

## Активная задача в реестре

`single-node-detection-first` (#47) — **остаётся active** (stage-gate не пройден; spectral-flux/cepstral впереди).

## Известный долг (не блокирует паузу)

- Harmonic benchmark v0.1: precision 50%, recall 100% (3 FP на synthetic).
- `micStreamTelemetry.ts` → прямой `@membrana/telemetry-service` (#30).
- `apps/demos/` — не в git (локальный Replit-export).

## После возвращения

```bash
git checkout techies68 && git pull
yarn morning-care
# читать STRATEGIC_PLAN_WEEK.md → задача 1 (метрики gate)
```
