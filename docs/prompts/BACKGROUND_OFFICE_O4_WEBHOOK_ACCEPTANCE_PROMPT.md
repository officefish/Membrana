# Промпт: background-office O4 — Linear webhook и приёмка прода

> **Task-промпт для агента-разработчика.**
> Эпик: [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](./BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).
> Зависит от: `background-office-o3-tls-deploy` (HTTPS работает).
> Размер: **S**. Ожидаемый артефакт: **1 PR** (документация + чеклист) + ручная приёмка в Linear.
> Реестр: `id` = `background-office-o4-webhook-acceptance`.
> GitHub Issue: [#61](https://github.com/officefish/Membrana/issues/61).

---

## Промпт целиком (для вставки агенту)

### Кто ты

DevOps-инженер Membrana (**Vesnin**). Финальная приёмка stateless office в проде.

### Что построить

1. **`packages/background-office/README.md`** — раздел `## Production deployment`:
   - URL `https://office.membrana.space`
   - env на VPS (`/etc/membrana/office.env`)
   - ротация секретов (кратко)
   - troubleshooting (DNS, cert, 401 token)
2. **`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`** §9–§10 — Linear webhook setup, smoke API, чеклист приёмки.
3. **`docs/discussions/background-office-v0.1.md`** — секция «Этап 5 — деплой» (платформа, домен, стоимость).
4. **`scripts/_ssh-office-smoke.mjs`** — remote curl health + `POST /v1/claude/ask` dry или persona ping (без вывода секретов).

### Linear webhook (ручной шаг постановщика + документирование)

| Параметр | Значение |
|----------|----------|
| URL | `https://office.membrana.space/webhooks/linear` |
| Secret | `LINEAR_WEBHOOK_SECRET` в `office.env` |
| Проверка | «Test webhook» в Linear → 200 в логах office |

### Smoke извне

```bash
curl -s https://office.membrana.space/health
curl -s -X POST https://office.membrana.space/v1/linear/issue/TEC-1 \
  -H "X-Membrana-Token: <API_INTERNAL_TOKEN>" \
  # (при наличии LINEAR_API_KEY на сервере)
```

### Definition of Done

- [ ] Linear test webhook → 200, подпись проходит
- [ ] README + deploy doc + journal обновлены
- [ ] Все секреты только на VPS
- [ ] Чеклист §10 в `BACKGROUND_OFFICE_DEPLOY.md` отмечен
- [ ] LGTM Teamlead

### Out of scope

- GitHub webhooks
- Клиентский `VITE_OFFICE_SERVER_URL` (отдельная задача при необходимости)
- Monitoring / alerting

### Порядок ролей

1. **Teamlead** — приёмка webhook в Linear UI
2. **Структурщик** — docs, smoke script

---

## Заметки для постановщика

1. Заполнить `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, `LINEAR_WEBHOOK_SECRET` в `/etc/membrana/office.env` **до** webhook-теста.
2. После merge: `yarn task:archive background-office-o4-webhook-acceptance --notes "…"`.
3. Затем: `yarn task:archive background-office-v1 --notes "эпик закрыт, O1–O4"`.
