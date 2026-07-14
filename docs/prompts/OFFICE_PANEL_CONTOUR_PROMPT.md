# Промпт: office-panel — подготовительный клиент panel.mmbrn.tech (эпик OP1–OP5)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер: **L (эпик, 5 фаз)**.
> Ожидаемый артефакт: **PR на фазу** (OP1..OP5 мержатся по готовности).
> Реестр: `id` = `office-panel-contour` (children `op1-panel-scaffold` … `op5-api-hardening`).

---

## Контекст

Владелец 2026-07-14: две задачи (drift-борд #396 и таблица trends DRONE_TIGHT vs
yamnet) указывают, что office нужен собственный клиент с визуализацией. Выходим в
**подготовительный спринт**: каркас панели на **panel.mmbrn.tech** — welcome-окно
доступно всем, разделы гейтятся по уровням, борды делаются ПОЗЖЕ как потребители.

**Консилиум-гейт пройден** (25 реплик, все развилки; протокол —
[`office-panel-contour-2026-07-14.md`](../seanses/office-panel-contour-2026-07-14.md);
research Perplexity ×3 —
[`office-panel-contour-research-2026-07-14.md`](../seanses/office-panel-contour-research-2026-07-14.md);
повестка с фактами репо — [`office-panel-contour-agenda-2026-07-14.md`](../seanses/office-panel-contour-agenda-2026-07-14.md)).
**Вердикт закрыл развилку drift-panel-placement (#396): борды живут в `apps/panel`.**

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| Протокол консилиума | Спецификация всех решений — спор НЕ переоткрывать |
| `apps/cabinet` | Прецедент стека (React+Vite+Tailwind+DaisyUI) и auth-shell UX |
| [`DESIGN.md`](../DESIGN.md) | Тёмная тема, один акцент, a11y |
| [`docs/comms/ALLY_PRIMER.md`](../comms/ALLY_PRIMER.md) | Язык welcome для союзников |
| ADR 0004 | office stateless (Р2), публичный digest (Р3) |
| скилл `membrana-office-vds-deploy` | Caddy/VDS/LE, уроки OM4-C |

**GitHub Issue:** #438.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план. Решения консилиума office-panel-contour НЕ переоткрывать.

---

### Фазы (мерж по готовности каждой)

**OP1 — scaffold `apps/panel`** (ozhegov): SPA по стеку кабинета (React+Vite+
Tailwind+DaisyUI), turbo build/lint/typecheck/test; НЕ импортирует internals
`apps/cabinet`; зависимости максимум `@membrana/core`. Термины: `panel` =
операторская витрина office ≠ `cabinet`.

**OP2 — auth-контур** (dynin): office остаётся stateless (ADR 0004 Р2).
Полный порядок ролей `public < ally < operator < owner`; детерминированный предикат
`canAccess(role, section) = role ≥ section.minRole` — юнит-тесты без БД/DOM.
`operator/owner` — GitHub OAuth (passport) + allowlist-файл (`user_id → role`);
`ally` — подписанный HMAC invite-код (secret в env, проверка чистой функцией, БЕЗ
хранилища); роль в **httpOnly cookie** (secure, sameSite; НЕ localStorage);
default-deny: глобальный AuthGuard + явный `@Public()`. Read-only каркас: тяжёлый
CSRF не городить (sameSite + no-store), точечный CSRF — при первой мутирующей ручке.

**OP3 — welcome + shell** (rodchenko): welcome-окно public по DESIGN.md (тёмная
тема, один акцент, язык ALLY_PRIMER — человеческий, без жаргона); shell навигации
разделов с бейджами уровня доступа; заглушки разделов; состояния login/error/loading
с первого коммита; a11y (`focus-visible`, `aria-label`).

**OP4 — деплой** (dynin + kuryokhin смоук): Caddy site-block `panel.mmbrn.tech`
(static SPA из turbo-сборки → volume) + `reverse_proxy /v1/*` → office-контейнер;
**LE-issuance только после DNS-гейта** — скрипт `.mjs` резолвит домен через ≥2
независимых резолвера и даёт go/no-go (урок OM4-C: сожжённый rate-limit).

**OP5 — Q3-hardening** (dynin): на панельных JSON-ответах `Cache-Control:
no-store`; rate-limit; data-минимизация (агрегаты, не сырьё); блок `/debug`,
`/metrics`; аудит доступа (лог ролей/секций). `/v1/drift-anchor/digest` остаётся
публичным (решение владельца, ADR 0004 Р3); новые API — default-deny + явный
`@Public()` + чек «агрегат, не сырьё».

---

### Запрещено (проголосованные ограничения)

- Импорт internals `apps/cabinet` или привязка к cabinet-auth/Postgres (изоляция).
- Persisted-хранилище учёток/invite-кодов на office (stateless, ADR 0004 Р2).
- Статический общий токен доступа (не различает роли — отклонён).
- Токены в localStorage.
- Сами борды (drift-anchor, trends DRONE_TIGHT vs yamnet), LLM-фичи, мутирующие
  ручки — вне эпика.
- LE-выпуск до прохождения DNS-гейта.

---

### Тесты

| Фаза | Минимум |
|------|---------|
| OP2 | предикат canAccess (полный порядок, default-deny), HMAC invite (валидный/просроченный/подделанный), allowlist-маппинг — чистые функции |
| OP3 | смоук рендера welcome/shell; состояния login/error/loading |
| OP4 | DNS-гейт: юнит на консистентность/расхождение резолверов (mock) |
| OP5 | заголовки no-store на JSON; @Public-инвентаризация (ни одного неявно публичного) |

---

### Definition of Done (эпика)

- [ ] `apps/panel` собирается turbo; welcome публично открывается на panel.mmbrn.tech.
- [ ] Уровни работают: ally-код открывает ally-разделы, GitHub-allowlist — operator/owner; httpOnly cookie.
- [ ] Default-deny подтверждён инвентаризацией `@Public()`.
- [ ] Деплой жив (LE после DNS-гейта), digest публичен, no-store/rate-limit на месте.
- [ ] LGTM Teamlead (closure review) по каждой фазе.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — границы фаз, LGTM каждой; условия: изоляция, stateless, DNS-гейт.
2. **Структурщик (Ozhegov)** — OP1; термины panel≠cabinet; топология volume/proxy.
3. **Математик (Dynin)** — OP2/OP4/OP5: предикат, HMAC, DNS-гейт, hardening; тесты.
4. **Музыкант (Kuryokhin)** — смоук деплоя; против расползания в мутации/CSRF-оверкилл.
5. **Верстальщик (Rodchenko)** — OP3: DESIGN.md, ALLY-язык, состояния, a11y.

---

## Заметки для человека-постановщика

1. GitHub Issue **#438** (эпик; children в реестре с `parentEpic`).
2. **Owner-гейты:** DNS A-запись `panel.mmbrn.tech` → 176.124.218.4; GitHub OAuth App
   (client id/secret); HMAC-secret и первые ally-коды; секреты на office VDS.
3. Потребители после эпика: drift-борд (финал #396 — вердикт placement уже есть)
   и таблица trends DRONE_TIGHT vs yamnet — отдельные карточки.
4. После merge фаз: `yarn task:archive` по child-картам, затем эпик.

### Проверка после PR (фазные)

```bash
yarn turbo run lint typecheck test build --filter=@membrana/panel
node scripts/panel-dns-gate.mjs   # go/no-go перед LE (OP4)
curl -sI https://panel.mmbrn.tech | Select-String 'HTTP|cache'
```

---

## Связь с дорожной картой

- Разрешён консилиум-гейт drift-panel-placement (#396) — финал эпика дрейф-якорей разблокирован.
- Каркас — предпосылка бордов: drift-anchor (3 строки якорей, danger «Прод ≠ main») и trends DRONE_TIGHT vs yamnet.
- Ally-уровень продолжает линию союзников (#428 telegram, ALLY_PRIMER).
