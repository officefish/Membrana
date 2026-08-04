# Процедура: deploy-office-vds — выкладка на office-VDS с прогоном в журнале

**Определение.** `deploy-office-vds` — процедура разворачивания на выделенный
office-VDS (office.mmbrn.tech, MSK): сервисы **office** и **panel**. Хост и доступ —
`getOfficeSshConfig` (`scripts/_ssh-office-config.mjs`); вход исполнителя — `yarn vds:run`.

**Держатель:** Vesnin (`leadPersona` манифеста).

**Происхождение.** Слово владельца 04.08: «Деплой как процедура с прогонами. Два
сервера — значит и процедуры будет две. Пока две». Одна процедура **на сервер**
(эшелон), сервис — параметр прогона; посервисная конкретизация — специализациями
позже. Канон формы — ADR-0023 (ACCEPTED 04.08, амандмент Р1 по слову владельца);
грунт — [обзор деплоя 03.08](../../deploy-survey-2026-08-03.md) (П1, П2).

## Кадры

| Кадр | Держатель | Что |
|------|-----------|-----|
| `build` | vesnin | сборка (`office:build`, `office:docker:prod:build`) — глаголы остаются исполнителями |
| `rollout` | tarasov | выкладка через `vds:run`; **гейт `owner-rollout`**: `deploy:when-green` печатает, владелец запускает |
| `smoke` | dynin | проверка развёрнутого + дрейф прод↔ствол (`office-drift-code-cron`) |
| `record` | angelina | запись прогона в общую ленту `docs/procedure-runs/` через `deploy-run` |

## Журнал прогонов

Носитель — общая лента (`procedure-run-journal@1`), своего носителя нет.
`yarn deploy:run deploy-office-vds --service <office|panel> -- <команда>` открывает
прогон (subject = сервис + ревизия), исполняет команду, закрывает `pass`/`fail`.
Секреты и env-значения в журнал не пишутся никогда (Р3 ADR-0023). Обрыв ловится
ленивым закрытием следующего прогона (#1694).

## Боевые ловушки

Скилл [`membrana-office-vds-deploy`](../../../.cursor/skills/membrana-office-vds-deploy/SKILL.md):
таймауты провайдер-фильтра, Let's Encrypt, docker 429.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `id: deploy-office-vds`, кадры
`build → rollout(gate owner-rollout) → smoke → record`; зуб — `validateProcedure`.
