# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-03T11:51:57.944Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/studio-capture-adaptation-2026-07-03.md` |
| Порядок ролей | Teamlead → Структурщик → Верстальщик → Музыкант → Математик |
| Повестка | `docs/STUDIO_CAPTURE_ADAPTATION_BRIEF.md` |

**Вопрос:**

Сплани спринт адаптации Membrana Studio (Electron) к явному захвату устройства v2 (см. topic-file): renderer=apps/client уже несёт всю v2-логику; реши S1-S6/OQ1-OQ7 -- таймер-троттлинг TTL, emergency stop при скрытом окне, паритет трёх хостов (STUDIO_HOST_BRIDGE_CONTRACT §Capture), smoke studio-хоста, доставка client-dist и совместимость старых сборок, разбивка с учётом недоступности оператора ~2 недели.

---

# Консилиум: Studio — адаптация к явному захвату устройства (tariff v2)

**Повестка:** Membrana Studio (Electron) должна корректно работать как полевой follower при явном захвате устройства с сервера. Renderer уже несёт всю v2-логику; нужно решить Electron-специфичные проблемы (TTL timer throttling, emergency stop при скрытом окне, паритет хостов, smoke, доставка, совместимость версий) и спланировать спринт с учётом недоступности оператора.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Верстальщик → Музыкант → Математик (циклически)

---

[Teamlead]: Ситуация четкая: renderer=apps/client уже merged с полной v2-логикой (capture store, TTL, enforcement, alerts, LWW). Electron-специфика остаётся минимальной, но критичной — timer throttling при свёрнутом окне убьёт TTL auto-release на 5 минут, а это нарушает инвариант гарантированного отпуска захвата. Я вижу спринт из трёх параллельных потоков: (1) S1–S3 technical (структурщик + математик), (2) S4 smoke (вся команда, но ручная часть отложена), (3) S5–DR6 доставка (структурщик + я). Начнём с открытого вопроса: кто владеет TTL throttling fix?

[Структурщик]: Я беру S1 и часть S5. TTL timer throttling в Electron — это чистая issue `backgroundThrottling: false` для окна при активном захвате. Вариант OQ1 я разрешу просто: `backgroundThrottling: false` **статически всегда** (студия — инструмент для оператора, работающий в foreground). Если оператор свернул окно — это его ответственность, мы не можем гарантировать таймеры. Но прямое решение: поднять окно в foreground в момент захвата через `mainWindow.focus()` и показать alert дополнительный. Это раз.

Второе: OQ1 про powerSaveBlocker — не используем. Это кроссплатформенное усложнение; достаточно focus и `backgroundThrottling: false`. Третье: старые сборки студии в v2 будут молча дропить pause/resume/setMode (gateway whitelist уже защищает) — это техническое долг, который закроем в DR6 с мин. версией клиента в handshake. На этот спринт: **пересборка client-dist и минимальный маркер версии** (один number в asset-манифесте).

[Верстальщик]: По S5, UI-сторона: toast-алерты захвата над полноэкранным бордом в Electron должны быть видны и интерактивны. Z-слои: алерт лежит поверх борда через `toast-end` DaisyUI + `z-50` (Tailwind). Это уже есть в текущем коде. Вопрос OQ5 про нативную нотификацию при скрытом окне — **не в этом спринте**: текущего toast достаточно для паритета с браузером. Если окно скрыто, оператор не видит UI и так; alert будет ждать, пока окно вернётся в foreground.

Я также беру S4 визуальную часть smoke (скриншоты badges, alert, читаемость в UI), но это зависит от логики выше. Ручной smoke (сама проверка паритета в UI) — отложена с оператором.

[Музыкант]: Я отвечу на OQ3 про Web Audio в Electron. Fade и `stopAllActivePlayback` живут в `@membrana/audio-engine-service`, это чистая логика через `AudioContext.resume()` и `gainNode.gain.linearRampToValueAtTime()`. Electron = Chromium = тот же Web Audio API, никаких отличий. Плагин VDR-валидация лишь читает `microphoneStreamHub` и состояние из audio-engine — тоже без особенностей.

Но: есть одна неявная зависимость в S6 про ручной smoke. Мне нужно, чтобы **ручная проверка fade в реальных условиях** (live capture → stop with fade) прошла в Electron перед тем, как принять спринт done. На виртуальном уровне я могу гарантировать контракт, но требуется слуховая проверка (нет артефактов на стыке fade). Это ручной smoke-пункт, отложенный с оператором.

[Математик]: Я решу OQ6 про тест S1 (TTL throttling). Юнит-тест в vitest не поймает реальный throttle Electron-окна — нужна интеграция. Я предложу: (1) виртуальный unit на логику timer-обработки boardLeaseBridge (mock timers, проверка TTL-разряда) — **в этом спринте**; (2) electron-интеграционный smoke с real timers и меркой (фоновое окно 6+ минут, проверка auto-release) — **в ручной части**, отложено.

Для виртуальной части: я напишу тест в `packages/agenda/src/core/__tests__/board-lease-bridge.test.ts`, проверяющий, что TTL-таймер срабатывает за 5 мин и вызывает `release()`. Mock: `vitest.useFakeTimers()`, advance на 301 сек, check `release` called.

Плюс: я добавлю в smoke-runbook (DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md) отдельный раздел **Studio capture smoke** с пунктами, которые программно проверяемы (контракт boardLeaseBridge, парсинг логов) и которые ручные (реальный TTL + фон).

[Teamlead]: Хорошо. Теперь я спланирую спринт по фазам. **S1 (TTL throttling fix)** — Структурщик:
- `mainWindow.backgroundThrottling = false` в `main.ts` (статическое, all-time).
- При `capture` event в renderer → IPC → main → `mainWindow.focus()`.
- Test: виртуальный в `packages/agenda/src/core/__tests__/board-lease-bridge.test.ts` (Математик).
- Размер: XS, ~2–3 часа.

**S2 (Emergency stop)** — выношу в отложено **deferred**, но дам явный вердикт: инвариант §3.3 выполняется кнопкой Stop в UI; при скрытом окне оператор может быстро вернуться (Alt+Tab / click в taskbar) и нажать. Tray-shortcut добавим в следующий спринт (ST7 или позже), это не блокер. Risk: закрою явно в PR-описании.

**S3 (Паритет хостов)** — Структурщик + я:
- Дополнить STUDIO_HOST_BRIDGE_CONTRACT §Capture таблицей (3 хоста × состояния × поведение).
- Проверка: паритет уже есть в коде (одна и та же capture-ось в client), нужна только документация.
- Размер: XS, ~1 час.

**S4 (Smoke Studio-хоста)** — все роли:
- Часть 1 (программная, этот спринт): виртуальный unit-тест TTL (Математик), контракт-парсинг логов в `logs:parse` (Математик), визуальная проверка алертов в UI (Верстальщик эталон-компонент).
- Часть 2 (ручная, отложена ~2026-07-17): полный capture-цикл в paired Studio (Electron + cabinet), проверка live badges/alerts/TTL/LWW/fade, слух на fade (Музыкант).
- Runbook: `DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md` расширить колонкой **Studio paired**.
- Размер: M/L (ручная часть значительная), программная часть S (2–3 часа).

**S5 (Доставка + совместимость)** — Структурщик + я:
- Пересборка `client-dist` с новым v2-кодом (capture-логика уже в main).
- Минимальный маркер версии: добавить поле `clientVersion` в `apps/membrana-studio/package.json` → read в renderer через `window.electronAPI.getAppVersion()` → включить в handshake WS (paired режим, cabinet зафиксирует версию и может логировать старую сборку как warning).
- Контракт: старая студия v1 (pause/setMode) + новый gateway v2 (whitelist) = silent drop + warning в кабинете. Явно принимаем; оператор обновит бинарник.
- Release-pipeline: проверка в `desktop-studio.yml` — если client-dist changed → rebuild и sign.
- Размер: S/M, ~3–4 часа.

**DR6 (Версионирование)** — зарегистрирован, не сделан в этом спринте; только подготовка S5.

**OQ2 (Emergency stop из tray)** — отложу явно в IT-backlog (ST7), с пометкой риска в PR.

**OQ4 (Контракт-совместимость)** — решено в S5: маркер версии + alert в кабинете, без strict gate.

**Фазировка:**

| Фаза | Владелец | Размер | Статус | Дата |
|------|----------|--------|--------|------|
| **S1a. `backgroundThrottling=false`** | Структурщик | XS | этот спринт | 2026-07-05 |
| **S1b. TTL unit-тест** | Математик | XS | этот спринт | 2026-07-05 |
| **S3. Таблица паритета хостов** | Структурщик + Teamlead | XS | этот спринт | 2026-07-06 |
| **S5. client-dist rebuild + маркер версии** | Структурщик | M | этот спринт | 2026-07-07 |
| **S4a. Runbook + smoke-unit (logs:parse)** | Математик | S | этот спринт | 2026-07-07 |
| **S4b. UI smoke-snapshot (Верстальщик)** | Верстальщик | XS | этот спринт | 2026-07-07 |
| **S4c. Ручной smoke (paired, live, fade)** | все | M | **deferred ~2026-07-17** | после оборудования |
| **DR6 (версионирование, gate)** | Teamlead | S | **backlog ST7** | — |
| **OQ2 (tray emergency stop)** | Музыкант | M | **backlog ST7** | — |

**DoD спринта:**
- [ ] S1a: PR `mainWindow.backgroundThrottling = false` merged.
- [ ] S1b: vitest unit `board-lease-bridge.test.ts` проходит, TTL-logic coverage ≥90%.
- [ ] S3: STUDIO_HOST_BRIDGE_CONTRACT дополнен §Capture таблицей (3 хоста).
- [ ] S5: client-dist пересобран, clientVersion в handshake, desktop-studio.yml проверяет changes.
- [ ] S4a: DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md расширен колонкой Studio, runbook пункты 1–N программные — зелёные.
- [ ] S4b: UI smoke (Верстальщик) — скриншоты alert/badges в Studio, читаемость в DESIGN.md токенах — ОК.
- [ ] Все роли: PR code-review, LGTM дан.
- [ ] Риск OQ2 задокументирован в PR-описании (tray stop отложен).

---

[Структурщик]: Я согласен с фазировкой. Добавлю деталь к S1a: `backgroundThrottling = false` установлю в `createWindow()` при инициализации (не только при захвате), это безопаснее. Также в S1 добавлю test на повторную активацию окна (focus при захвате, проверка что focus вызывается, не более одного раза за операцию). S5 я тоже беру в полном объёме: пересборка, маркер версии, pipeline. Вопрос: где читать clientVersion в renderer? Я предлагаю `window.electronAPI.getAppVersion()` → возвращает `{major, minor, patch, buildNumber}` → сериализуем в handshake WS как строка `"1.2.3"`. Cabinet логирует на стороне, при mismatch старой версии — warning в `background-office` logs.

[Верстальщик]: Я понял. На S4b я беру snapshot-проверку: запустить Studio в режиме paired (мокированный cabinet локально), триггер захват через cabinet → проверить что alert появляется над бордом, badge видна в header, z-слои не ломаются. Визуально: скриншот в DESIGN.md обновлю с примером (Alert layout + badges capture state). Это pure UI, без audio-логики, может быть независимо. ОК?

[Музыкант]: По S6 (ручной smoke): я отмечу в runbook пункты, которые нужны: (1) live fade при stop с захватом (listen that no artifacts), (2) VDR-плагин остаётся активным после fade (компонент должен читать состояние правильно). Это звуковая проверка, нужен человек и микрофон. До оборудования это отложено. Софтварно: я проверю, что компоненты и хуки не имеют Electron-специфичных предположений (все через `@membrana/audio-engine-service`), это уже пройдёт.

[Математик]: Я готов к S1b и S4a. Unit-тест `board-lease-bridge.test.ts`: я напишу цикл (1) инициализировать boardLeaseBridge с TTL=5min, (2) advance timers на 301 сек, (3) проверить что `release()` вызван ровно один раз. Покрытие: базовый TTL, также teste что heartbeat сбрасывает таймер (capture → heartbeat → advance 301 сек → verify taймер сброшен, release НЕ вызван). Coverage target ≥90%.

Для S4a (smoke-runbook): я добавлю в DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md отдельный блок **§Studio (Electron) capture smoke**, с чек-листом программных пунктов (unit-тест, logs:parse heartbeat/release events, жизненный цикл WS handshake с версией) и отдельный блок **ручной** (список пунктов для оператора, дата ~2026-07-17). Приложу скрипт `logs:parse --filter=capture-lifecycle` для быстрой проверки эвентов из журнала Studio.

[Teamlead]: Отлично. Я фиксирую решение финальной таблицей и Definition of Done.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **S1: TTL timer throttling** | `mainWindow.backgroundThrottling = false` статическое (all-time в createWindow) + focus при event capture. Unit-тест `board-lease-bridge.test.ts` (Математик): timers mock, advance 301 сек, verify release() вызван. |
| **S2: Emergency stop при скрытом окне** | Инвариант §3.3 выполняется кнопкой Stop в UI; при скрытом окне — быстрый Alt+Tab + click. **Отложено в ST7** (tray/global-shortcut): явный risk в PR-описании. |
| **S3: Паритет трёх хостов** | STUDIO_HOST_BRIDGE_CONTRACT дополнен §Capture таблицей: browser follower / studio follower / cabinet capturer → состояния × поведение. Документирование только, логика уже одна в коде. |
| **S4: Smoke Studio-хоста** | **Программная (этот спринт)**: runbook DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md колонка Studio; unit-тест TTL (Математик); logs:parse smoke-скрипт; UI snapshot (Верстальщик). **Ручная (deferred ~2026-07-17)**: full paired capture cycle, live fade/LWW/alerts, слух на fade (оборудование доступно). |
| **S5: Доставка + совместимость** | Пересборка client-dist (capture-логика already merged). Маркер версии: clientVersion в handshake WS (cabinet логирует старую как warning). Старая студия v1 + новый gateway v2 = silent drop pause/setMode (whitelist защищает). Release-pipeline: if client-dist changed → rebuild & sign. |
| **OQ1 (powerSaveBlocker)** | Не используем; достаточно `backgroundThrottling=false` + focus. |
| **OQ2 (tray stop)** | Отложено в ST7 (follow-up sprint). Risk task: #XXX. |
| **OQ3 (Web Audio Electron)** | Electron = Chromium = тот же API. Fade/VDR-плагин работают без особенностей. Проверка: ручной smoke (слух). |
| **OQ4 (версионирование gate)** | Принимаем молчаливую деградацию старых сборок (whitelist уже защищает). Маркер версии в S5 для логирования; strict gate → DR6 (backlog). |
| **OQ5 (нативная нотификация)** | Не в этом спринте; текущих toast достаточно для паритета с браузером. |
| **OQ6 (тест TTL throttling)** | Виртуальный unit-тест (vitest mock timers) — этот спринт. Интеграционный smoke (real timers, real Electron фон) — ручная часть, deferred. |
| **OQ7 (размер/фазы)** | См. таблицу фазирования выше. Программная часть: 4–5 дней (S–M задачи параллельно). Ручная часть: отложена с оборудованием. |

---

### Definition of Done

**Программная часть (этот спринт, DoD):**

1. **S1a:** PR `apps/membrana-studio/src/main.ts` — `mainWindow.backgroundThrottling = false` в `createWindow()`, + логика focus при IPC-event capture.
2. **S1b:** PR `packages/agenda/src/core/__tests__/board-lease-bridge.test.ts` — unit-тесты TTL (advance timers, verify release), heartbeat сброс, coverage ≥90%.
3. **S3:** PR `docs/STUDIO_HOST_BRIDGE_CONTRACT.md` — новая таблица §Capture (3 хоста × 5 состояний × поведение).
4. **S5a:** PR пересборка `client-dist` с capture-логикой merged (verificaciòn: diff только changed files из capture-спринта).
5. **S5b:** PR `apps/membrana-studio/` — clientVersion в handshake (`window.electronAPI.getAppVersion()` + WS payload).
6. **S5c:** PR `.github/workflows/desktop-studio.yml` — условная проверка if client-dist changed → rebuild.
7. **S4a:** PR `docs/DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md` — новый блок **§Studio (Electron) smoke**, runbook + logs:parse script. Ручные пункты помечены **deferred ~2026-07-17, требует оборудования**.
8. **S4b:** PR `docs/DESIGN.md` — обновить примеры (alert layout Studio, badges, z-слои) + скриншот в `images/studio-capture-ui.png`.
9. **Risk task:** Создан в GitHub (PR link) с заголовком «ST7: Tray emergency stop при свёрнутом окне».
10. **Code review:** Все PR имеют LGTM от Teamlead. Smoke runbook подписан Математиком (testable ✓).

**Ручная часть (deferred ~2026-07-17):**

- [ ] Studio paired (Electron + cabinet local) — capture/release/TTL/LWW/fade.
- [ ] Live VDR-плагин при захвате.
- [ ] Слуховая проверка fade (no artifacts).
- [ ] Заполнить итоги в DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md §Studio manual smoke пункты.

---

*Реплик в диалоге: 25; каждый участник высказался не менее одного раза.*
