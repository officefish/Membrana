# OPEN: Night Hunt sprint

**Epic:** `night-hunt-sprint-2026-06-25` · **Issue [#174](https://github.com/officefish/Membrana/issues/174)**  
**Промпт:** [`NIGHT_HUNT_SPRINT_PROMPT.md`](../../prompts/NIGHT_HUNT_SPRINT_PROMPT.md)  
**Дата открытия:** 2026-06-25  
**Статус:** **active**

---

## Цель

Optional ночные отчёты: **background-office** (cron) → **OpenRouter** → **GitHub PR** → утренний review → вечерняя архивация.

---

## Фазы

| Phase | id | Статус | Примечание |
|-------|-----|--------|------------|
| NH0 | *(оформление)* | **done** | Issue #174, OPEN, промпт |
| NH1 | `nh-s1-office-module` | **ready for PR** | код в ветке |
| NH2 | `nh-s2-fly-deploy` | **blocked: operator** | secrets + deploy |
| NH3 | `nh-s3-rituals` | **ready for PR** | ritual hooks |

---

## Блокер — только оператор (NH2)

- [ ] Fly deploy или redeploy VPS
- [ ] Secrets: `OPENROUTER_API_KEY`, `GITHUB_TOKEN` (repo write), `NIGHT_HUNT_ENABLED=true`
- [ ] Label `night-hunt` в GitHub

---

## Следующий шаг агента

1. GitHub Issue + PR (NH1+NH3)  
2. После merge — ждём оператора на NH2  
3. Первая ночь → утренний `night-hunt:pr-review`
