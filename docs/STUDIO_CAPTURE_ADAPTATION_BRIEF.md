# Бриф для консилиума — Studio: адаптация к явному захвату устройства (tariff v2)

| Поле | Значение |
|------|----------|
| **Статус** | Бриф (вход в консилиум), не протокол |
| **Повод** | Отложенный скоуп канона [`DEVICE_BOARD_SERVER_FIRST.md`](./DEVICE_BOARD_SERVER_FIRST.md) v2.0 §10: «Настольная Studio — подгонка отдельным спринтом» (требование владельца 2026-07-03) |
| **Связано** | [`STUDIO_HOST_BRIDGE_CONTRACT.md`](./STUDIO_HOST_BRIDGE_CONTRACT.md) v0.1 · `STUDIO_HOST_LESSONS.md` (STx) · capture-спринт merged #232 · `dpr-dr6-client-delivery` (conditional desktop builds) |
| **Предлагаемый slug** | `studio-capture-adaptation` |

---

## Вопрос консилиуму (повестка)

Membrana Studio (Electron) должна корректно вести себя как **полевой follower** при явном захвате устройства с сервера (tariff v2). Renderer студии = `apps/client` — вся v2-логика (capture store, TTL auto-release, enforcement soft/hard, alerts, LWW, fade, emergency stop) уже в общем коде. Что остаётся Electron-специфичного, как гарантировать паритет с browser-хостом, и как доставить обновление (client-dist / release pipeline)?

---

## Факты репозитория (проверено 2026-07-03)

| Факт | Источник |
|------|----------|
| Studio renderer — **`apps/client` в Electron** (`client-dist/`); бизнес-логика в main-процессе запрещена (кроме FS/IPC) | STUDIO_HOST_BRIDGE_CONTRACT §Принципы |
| Main-процесс студии **не содержит** runtime/WS/pause-хуков (journal/media-library/logging/trends FS+IPC only) — v2-wire его не ломает | grep `apps/membrana-studio/src` |
| Вся v2-клиентская логика уже merged в main: ось capture, boardLeaseBridge (capture/heartbeat/release + TTL-таймер 5 мин `setTimeout`), controller enforcement + LWW, `stopAllActivePlayback` fade, CaptureAlertToasts, плагин «VDR-валидация» | capture-спринт #232, HG2 #234 |
| Paired-режим Studio (WS к cabinet) работал в v1 (ST4: sync cabinet journal HTTP+WS) | STUDIO_HOST_BRIDGE_CONTRACT §2 |
| CT7 удалил из wire `pause`/`resume`/`setMode` и отключил edit-lease REST — **старые сборки студии** шлют эти команды/вызовы и получают silent drop / 404 | canon v2 §9, gateway whitelist |
| Studio-сборка: `yarn studio:*`, `client-dist` пакуется билдом; release — `desktop-studio.yml` (conditional, «Decide if studio affected»); DR6 (версия-индикатор + contract-совместимость) — зарегистрирован, не сделан | package.json studio, workflows |
| Smoke студии — `yarn logs:parse` (STx-дневник); капчер-смоук `DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md` написан только для browser-хоста | канон §11, smoke runbook |

---

## Гипотеза скоупа (что реально Electron-специфично)

| # | Тема | Суть |
|---|------|------|
| S1 | **Timer throttling** | TTL auto-release (5 мин `setTimeout`) и heartbeat-обработка живут в renderer. Свёрнутое/фоновое окно Electron троттлит таймеры → auto-release может опоздать, захваченная студия «зависнет» в ведомости дольше TTL. Нужен `backgroundThrottling: false` для окна (или powerSaveBlocker на время захвата) + тест |
| S2 | **Emergency stop при захвате** | Инвариант §3.3 в свёрнутой/фоновой студии: стоп должен быть достижим (окно может быть скрыто). Вопрос: нужен ли tray/global-shortcut аварийный стоп в этом спринте или отложить |
| S3 | **Паритет хостов** | STUDIO_HOST_BRIDGE_CONTRACT дополнить §Capture: таблица поведения трёх хостов (browser follower / studio follower / cabinet захватчик); autonomous studio без WS — захват невозможен by design |
| S4 | **Smoke Studio-хоста** | Прогон capture-смоука в Studio (paired Electron): badges, alerts, TTL, LWW, fade, плагин VDR-валидация; фиксация в runbook отдельной колонкой + `logs:parse` пороги |
| S5 | **Доставка / совместимость версий** | Пересборка client-dist + release; **старая студия против нового gateway**: pause/setMode silently dropped, edit-lease 404 — деградация тихая. Минимальный контракт-гейт (версия клиента в handshake? предупреждение о несовместимости?) или явно принять тихую деградацию и закрыть DR6-ом |
| S6 | **Ручная часть** | Оператор недоступен ~2 недели (до ~2026-07-17, оборудование): ручной smoke (S4 частично) и полевые проверки — отложены; программная часть спринта не должна их блокировать |

---

## Открытые вопросы для ролей

- **OQ1 (Структурщик).** S1: `backgroundThrottling: false` глобально для окна vs `powerSaveBlocker` только при активном захвате (по событию из renderer через IPC)? Что дешевле/чище при запрете бизнес-логики в main?
- **OQ2 (Teamlead).** S2: аварийный стоп из tray/global shortcut — в этот спринт (тянет IPC main→renderer→audio-engine) или отложить с явной записью риска? Инвариант §3.3 формально выполняется кнопкой в UI — вопрос про скрытое окно.
- **OQ3 (Музыкант).** Fade/`stopAllActivePlayback` и live-окно VDR-плагина в Electron: есть ли известные отличия Web Audio в Electron (chromium) от браузера, нужны ли отдельные проверки в smoke.
- **OQ4 (Teamlead/Структурщик).** S5: контракт-совместимость — принять тихую деградацию старых сборок (whitelist уже защищает сервер) и оформить версии/gate в DR6, или в этом спринте минимальный маркер версии клиента?
- **OQ5 (Верстальщик).** Studio-специфика UI: toast-алерты захвата поверх фуллскрин-борда в Electron (z-слои, фокус окна) — достаточно текущего или нужна нативная нотификация при скрытом окне?
- **OQ6 (Математик).** Тест на S1: как программно проверить троттлинг-поведение TTL (fake timers не ловят реальный throttle) — vitest-юнит на logic + ручной пункт smoke, или electron-интеграционный тест?
- **OQ7 (Teamlead).** Размер/фазы спринта и что из него блокируется отсутствием оператора (S6): предложить разбивку, где ручной smoke — последняя фаза, отложенная до оборудования.

---

## Формат ожидаемого решения

- Таблица «Вопрос → Решение» по S1–S6/OQ1–OQ7.
- Фазы спринта с владельцами и размерами; ручные фазы — помечены deferred (~2026-07-17).
- Дополнение STUDIO_HOST_BRIDGE_CONTRACT §Capture — готовая таблица трёх хостов.
- DoD спринта.

---

## Запуск

```bash
yarn consilium \
  --topic-file docs/STUDIO_CAPTURE_ADAPTATION_BRIEF.md \
  --save-as studio-capture-adaptation \
  "Сплани спринт адаптации Membrana Studio (Electron) к явному захвату устройства v2 \
   (см. topic-file): renderer=apps/client уже несёт всю v2-логику; реши S1-S6/OQ1-OQ7 -- \
   таймер-троттлинг TTL, emergency stop при скрытом окне, паритет трёх хостов \
   (STUDIO_HOST_BRIDGE_CONTRACT §Capture), smoke studio-хоста, доставка client-dist и \
   совместимость старых сборок, разбивка с учётом недоступности оператора ~2 недели."
```
