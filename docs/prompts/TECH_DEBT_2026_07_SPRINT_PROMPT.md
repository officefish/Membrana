# Эпик: tech-debt-2026-07 — спринт технического долга

> Зарегистрирован 2026-07-08 по итогам разбора код-ревью 06–08.07 + известного долга.
> Координатор: Vesnin (Teamlead). Отдельный короткий спринт, **не замораживает** магистраль FREE-тарифа (S2).

## Контекст

Долг накопился и дважды укусил при деплое 08.07 (флейки CI build-order + stale-dist +
catalog-гейт). Свод собран из daily code-review (07.07/05.07 — архивные, повтор warning
`SampleLibraryModule.tsx:94`), сегодняшнего ревью (P1 `recedeRatio` — исправлен, P2
`aria-live`/singleton) и известного долга (память проекта, аудит singleton §3.5
`DEVICE_BOARD_SERVER_FIRST.md`).

## Границы эпика

- **CI/сборка (TD1)** идёт в существующий эпик [`ci-gate-stabilization`](./CI_GATE_STABILIZATION_SPRINT_PROMPT.md) (cg5–cg7) — не плодим дубль.
- **Этот эпик** = персистентность полевого узла (TD2) + enforcement границ/singleton (TD3).
- **Чистка (TD4/TD5)** зарегистрирована как `deferred` (бэклог), поднимается фоном.
- **Вне долга (продукт):** combinedScore-продюсер (оживить alarm-gate B) — магистраль S2.

## Карточки

### Активные (P0/P1)

| id | Кластер | Что | Приоритет | Размер |
|----|---------|-----|-----------|--------|
| `cg5-detector-base-build-order` | TD1 (→ci-gate) | Флейки harmonic-integration: `@membrana/detector-base` dist не собран к job'у — зафиксировать build-order в turbo-графе/prebuild | **P0** | M |
| `cg6-stale-dist-gate` | TD1 (→ci-gate) | stale-dist: dist пакетов как входы turbo / clean-build в CI, чтобы client typecheck не ловил `any` (кейс fft-analyzer 08.07) | P1 | S |
| `cg7-catalog-verify-prepush` | TD1 (→ci-gate) | `catalog:verify-client` в pre-push hook — ловить дыру каталога до красного CI | P1 | S |
| `td-scenario-registry-persistence` | TD2 | `DeviceScenarioRegistry` (in-memory) → **реальная персистентность** выбора сценария (переживает рестарт сервера) | P1 | M |
| `td-node-lastseen-reconnect` | TD2 | `lastSeenAt` пишется на `registerNode`/реконнекте (хвост PCB4 — сейчас читается из БД, апдейт не пишется) | P1 | S |
| `td-singleton-eslint-guard` | TD3 | eslint-правило на 2 вектора дубля §3.5: провайдер не `new`-ит мост; `connect()`/`start()` идемпотентны (корни CSR1/PCB) | P1 | M |

### Бэклог (deferred, P2)

| id | Что | Размер |
|----|-----|--------|
| `td-samplelibrary-usememo` | `SampleLibraryModule.tsx:94` react-hooks warning (`samples` в useMemo) | S |
| `td-deprecated-todo-triage` | Триаж `@deprecated` (~1624) + TODO/FIXME (402) → инвентарь, «удалить/оставить», карточки | M |
| `td-linkstate-ratelimit` | rate-limit link-state polling (хвост PCB review) | S |
| `td-tariff-v3-skips-registry` | Реестр tariff-v3 скипов/заглушек (34 маркера) — не потерять при апгрейде тарифа | S |

## Definition of Done эпика

- cg5 (P0) закрыт: harmonic-integration стабилен, `assertCiGreen` не флейкает на build-order
- TD2: выбор сценария переживает рестарт сервера (или явный ephemeral-контракт задокументирован)
- TD3: eslint-правило зелёное, ловит оба вектора дубля на тестовом кейсе
- Магистраль FREE не заморожена — спринт короткий (2–3 дня)

## Ссылки

- Аудит singleton: `DEVICE_BOARD_SERVER_FIRST.md §3.5`
- CI-эпик: `ci-gate-stabilization` (cg1–cg7)
- Код-ревью 08.07: `docs/discussions/uncommitted-code-review.md`
