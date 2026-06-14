# Membrane Platform — деплой и prod-smoke по фазам

> **Регламент приёмки эпика [#67](https://github.com/officefish/Membrana/issues/67):**
> каждая фаза **MP1–MP5** считается готовой к архивации только после **деплоя на прод** и прохождения **prod-smoke** из таблицы ниже.
> Локальный dev и CI **не заменяют** prod-проверку.
>
> Канон: [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) · Эпик: [`prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md`](../prompts/MEMBRANE_PLATFORM_V1_EPIC_PROMPT.md).

---

## Принцип закрытия задач

```text
merge PR → деплой на VPS → prod-smoke фазы → отчёт в Issue #67 → yarn task:archive <id>
```

| Нельзя | Можно |
|--------|--------|
| `task:archive` только по локальному dev | Архив после prod-smoke + LGTM |
| Отложить весь prod на MP6 | Инкрементальный деплой после каждой фазы |
| Закрыть эпик без регрессии smoke MP1…MP5 | MP6 — финальная регрессия + runbook |

Связь с [`TASK_CLOSURE_REGULATION.md`](../prompts/TASK_CLOSURE_REGULATION.md): для задач `membrane-platform-mp*` в `archiveNotes` **обязательна** строка `Prod smoke: OK` + дата + URL.

---

## Prod-топология (цель)

| DNS | Сервис | Порт (внутри) | Фаза появления |
|-----|--------|---------------|----------------|
| `media.membrana.space` | `background-media` | 3010 | уже есть (#58–#66) |
| `cabinet.membrana.space` | `apps/cabinet` + API paths `/health`, `/v1/*` | 3020 / 8080 | **MP1** |
| `cabinet-api.membrana.space` | `background-cabinet` (опционально) | 3020 | MP1+DNS |

Один VPS (как media): Caddy TLS, Docker Compose, секреты в `/etc/membrana/*.env`.

Эталон media: [`BACKGROUND_MEDIA_DEPLOY.md`](./BACKGROUND_MEDIA_DEPLOY.md), `deploy/media-stack.sh`.

**MP1:** Dockerfile + compose + Caddy для cabinet — реализовано; см. [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md).

---

## Prod-smoke по фазам

### MP1 — Auth + shell (`membrane-platform-mp1-auth-cabinet`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | `GET https://cabinet.membrana.space/health` | `200`, `status: "ok"` |
| 2 | `POST https://cabinet.membrana.space/v1/auth/login` (prod user) | `200`, `token`, `user.login` |
| 3 | `GET https://cabinet.membrana.space/v1/auth/me` + `Authorization: Bearer` | `200`, тот же user |
| 4 | `GET https://cabinet.membrana.space/` | SPA загружается (200) |
| 5 | Login в браузере | Shell после входа, logout работает |
| 6 | `ALLOW_REGISTRATION` на проде | `false` (регистрация только admin/seed) |

**Артефакты деплоя (DoD MP1):** `packages/background-cabinet/Dockerfile`, compose, `deploy/cabinet-stack.sh`, `deploy/Caddyfile.cabinet.example`, `deploy/generate-cabinet-env.sh`.

---

### MP2 — Membrane, Tariff, Node, ключи TTL (`membrane-platform-mp2-membrane-node-keys`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1 smoke | без регрессии |
| 2 | UI: раздел «Мембрана» | тариф `free-v1`, квоты userStorage/buffer, `datasetCatalogId` |
| 3 | Создать узел | 1 узел на мембрану |
| 4 | Создать ключ с каждым `NodeAccessKeyDuration` | plaintext один раз, `expiresAt` корректен |
| 5 | Отзыв / ротация ключа | старый не принимается |

---

### MP3 — Pairing client (`membrane-platform-mp3-client-pairing`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP2 smoke | без регрессии |
| 2 | Выбор **автономного режима** при старте / в настройках | client работает с локальной ФС, pairing не требуется |
| 3 | Футер в `autonomous` | предупреждение: узел работает автономно |
| 4 | `apps/client` → «Связь с мембраной» | pairing по ключу с прода |
| 5 | После pairing | `deviceId` привязан, сессия client жива, футер — связанный режим |
| 6 | Имитация недоступности cabinet/media | диалог: предложение перейти в автономный режим; анализ не блокируется |

Проверка — **в браузере на полевом ПК** с HTTPS client build (не только localhost).

---

### MP4 — Media per membrane (`membrane-platform-mp4-media-membrane`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP3 smoke | без регрессии |
| 2 | `GET media…/quota` для paired device | отдельно `userStorage` и `buffer`; `dataset.catalogId` |
| 3 | Upload sample в user/buffer | учёт соответствующей квоты tariff |
| 4 | Второй membrane / device | изоляция данных |

---

### MP5 — Cloud journal (`membrane-platform-mp5-telemetry-journal`)

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | MP1–MP4 smoke | без регрессии |
| 2 | Client upload Report | карточка в cabinet |
| 3 | LiveRecord | badge live / lifecycle в UI |
| 4 | Shared render | тот же payload-type, что в client journal |

---

### MP6 — Финализация (`membrane-platform-mp6-prod-deploy`)

Не «первый выход в prod», а **закрепление runbook**:

| # | Проверка | Ожидание |
|---|----------|----------|
| 1 | Полная регрессия MP1–MP5 smoke | один чеклист, один сеанс |
| 2 | Документация деплоя | актуальна, секреты не в git |
| 3 | `membrana.space` → login | редирект / ссылка на cabinet (если в scope v1) |
| 4 | Мониторинг / health | Caddy + docker healthchecks |

---

## Шаблон отчёта в Issue #67 (перед `task:archive`)

```markdown
## MP<n> — отчёт

- PR: #…
- Deploy: `deploy/cabinet-stack.sh up` @ branch `vesnin` / `techies68`
- Prod smoke: OK (YYYY-MM-DD)
- Проверил: …

### Smoke
- [ ] … (из таблицы MP<n> выше)
```

---

## Команды

```bash
# VPS
./deploy/cabinet-stack.sh build && ./deploy/cabinet-stack.sh up && ./deploy/cabinet-stack.sh smoke
curl -fsS https://cabinet.membrana.space/health
```

Локально: `yarn cabinet:docker:up` или dev: `yarn cabinet:db:up` → `yarn cabinet:migrate` → `yarn cabinet:seed` → `yarn cabinet:dev` + `yarn cabinet:app:dev`.

---

## Текущий статус

| Фаза | Код | Prod deploy | Архив |
|------|-----|-------------|-------|
| MP0 | docs | — | archived |
| MP1 | auth + shell | **prod** 2026-06-13 | **archived** |
| MP2 | keys + tariff | **prod** | **archived** |
| MP3 | client pairing | **prod** | **archived** |
| **MP4** | media per membrane | **prod** 2026-06-12 | **archived** |
| MP5–MP6 | journal + final | — | active |

Подробный чеклист: [`BACKGROUND_CABINET_DEPLOY.md`](./BACKGROUND_CABINET_DEPLOY.md).

---

*Версия: 2026-06-13 · Регламент: prod-verify-before-archive*
