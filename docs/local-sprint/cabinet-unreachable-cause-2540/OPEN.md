# Membrana Local Sprint OPEN: cabinet-unreachable-cause-2540

| Поле | Значение |
|------|----------|
| Sprint | `cabinet-unreachable-cause-2540` |
| Procedure | `membrana-local-sprint` |
| Issue | [#2540](https://github.com/officefish/Membrana/issues/2540) — Studio: окно «Сервер недоступен · cabinet unreachable» несёт константу вместо причины |
| Registry | карточка НЕ заведена (фаза 1 — разбор и план; регистрация `sprintKind: membrana-local-sprint` — после ратификации, руками ведущей) |
| Cut | [`cabinet-unreachable-cause-2540.json`](../../sprint/cut/cabinet-unreachable-cause-2540.json) — **ратифицирован владельцем 02.10 06:28Z** («Ратифицирую с умолчаниями»; отметка инструментом `--ratify --at 2026-10-02T06:28:11Z`, digest `abecd987…`; `sprint:cut` → `contract`) |
| Cutter | vesnin → [`cut-cabinet-unreachable-cause-2540-vesnin.md`](../../discussions/cut-cabinet-unreachable-cause-2540-vesnin.md) · лента актов [`trail/cabinet-unreachable-cause-2540.jsonl`](../../sprint/cut/trail/cabinet-unreachable-cause-2540.jsonl) |
| Lead | vesnin |
| Support | ozhegov (слова окна для оператора) · rodchenko (форма строки в окне) · angelina (гейт, модератор) |
| Branch / tree | `fix/cabinet-unreachable-cause-2540` от `origin/main` `0eb88efa` · `Membrana-sanitation-b` |
| Status | OPEN · фаза 2 (02.10): **b1 сдан — PR [#2550](https://github.com/officefish/Membrana/pull/2550)** (`pr:ship --no-merge`, голова afa2b027, см. §«Исполнение b1»); **b2 — за владельцем**, инструкция в §«b2 — живая приёмка» |

## Симптом (живой опыт владельца 01.10, прибор `9e86ec85…`, Studio `02c6396a`)

Во время смены тарифа (опыт #2538) всплыло окно «Сервер недоступен» со строкой `cabinet unreachable`.
По нему нельзя понять, что случилось: сеть, прокси, ошибка сервера кабинета или что-то ещё. Разбор #2538
показал: с тарифом это кодом не связано — отдельный дефект наблюдаемости.

## Разбор по коду (ствол `0eb88efa`) — каждая строка сведена к адресу

### 1. Путь ошибки от fetch до окна — и где теряется причина

| Шаг | Что происходит | Адрес |
|---|---|---|
| Запрос | `fetch(.../v1/pair/status)`; 401 → `'session_expired'`; 404 → `'endpoint_unavailable'`; иначе `throw new Error(await parseError(res))` | `apps/client/src/api/pairing.ts:86-96` |
| Текст ошибки HTTP | `parseError`: `body.message` либо `res.statusText \|\| 'Request failed'`. **`res.status` в сообщение не попадает никогда**; при HTTP/2 `statusText` в Chromium пуст — на 502 с HTML-телом от прокси уходит голое «Request failed» | `api/pairing.ts:62-71` |
| Сетевой отказ | `TypeError: Failed to fetch` летит как есть (без кода). **Таймаута нет**: `AbortSignal` не передаётся, висящее соединение ошибки не даёт вовсе | `api/pairing.ts:89` |
| **Точка потери** | `catch {` без привязки — ошибка выбрасывается, в стор уходит константа `'cabinet unreachable'` | `apps/client/src/hooks/usePairStatusMonitor.ts:57-61` |
| Соседняя ветка | `pingMediaApi` возвращает `boolean`, причину глотает сам → константа `'media-server unreachable'` | `usePairStatusMonitor.ts:50-53`; `api/pairing.ts:108-121` |
| Стор | `reportConnectionError(message)`: при `mode === 'paired'` → `set({ lastConnectionError: message, showFallbackDialog: true })` — **безусловно**, ни счётчика, ни порога, ни дебаунса | `apps/client/src/stores/nodeConnectionStore.ts:180-184` |
| Второй вызывающий | ошибка сопряжения с фильтром по словам `fetch`/`network` → `reportConnectionError(err.message)` | `components/node-connection/MembranePairingPanel.tsx:33-37` |
| Окно | заголовок «Сервер недоступен», абзац литералом, ниже `lastConnectionError` моноширинно. Таблицы текстов нет | `components/node-connection/ConnectionFallbackDialog.tsx:28-37` |
| Журнал | порт оболочки Studio `writeElectronShellLog(level, message)` → IPC → electron-log `{userData}/logs/shell-YYYY-MM-DD.log` с метками времени (в браузере — no-op). **Отказ опроса туда не пишется** | `apps/client/src/lib/electronShellLogPort.ts`; `apps/membrana-studio/src/logging/shell-log.ts` |
| Снятие | `reportConnectionRestored` — только по успешному `pingMediaApi` из индикатора подвала (раз в 60 с), и только если оператор выбрал «Остаться» | `NodeConnectionFooterIndicator.tsx:24-28`; `nodeConnectionStore.ts:192-195` |

Итог: причина рождается в `api/pairing.ts` (статус и тело ответа либо `TypeError`) и умирает в одной строке —
`catch {}` хука. Но даже если бы её сохранили, сообщение `parseError` не несёт номера статуса.

### 2. Какие классы отказа различимы на клиенте

Renderer в Electron и браузер одинаковы: у обоих только WHATWG `fetch`, кодов сети (`net::ERR_*`) нет.

| Класс | Чем различим сегодня / после b1 | Electron | Браузер |
|---|---|---|---|
| HTTP 5xx (502/503/504 от Caddy или кабинета) | `res.status` + тело `{message}` — после b1 | да | да |
| HTTP 429 | `res.status` — после b1. У кабинета `ThrottlerGuard` на `pair/status` **нет** (grep по `packages/background-cabinet/src` пуст); 429 может дать только прокси/сеть перед ним | да | да |
| HTTP 403 (гео, запрет) | `res.status` — после b1 | да | да |
| 401 / 404 | уже различены: `session_expired` / `endpoint_unavailable` (окно не показываются) | да | да |
| Нет сети на компьютере | `navigator.onLine === false` — дёшево, но лишь «сеть выключена»; «сеть есть, а до сервера не дойти» так не ловится | да | да |
| DNS / отказ соединения / прокси | один `TypeError: Failed to fetch` без кода — **неразличимы между собой** в renderer. Коды есть только в главном процессе Electron (`net`) — новый IPC-пробник, развилка 3 | нет (без IPC) | нет |
| CORS | тот же `TypeError` — **неотличим от сети**. Живой пробник prod 02.10 (`OPTIONS /v1/pair/status`, read-only): для `Origin: file://` и `Origin: null` — 204 **без** `Access-Control-Allow-Origin`; для `http://localhost:5173` и `https://cabinet.membrana.space` — 204 с ACAO. Studio-сборка грузит renderer `loadFile` (origin `file://`, `apps/membrana-studio/src/main.ts:60`), dev — `loadURL localhost` (`:57`) | нет | нет |
| Таймаут | **не наблюдается вовсе**: без `AbortSignal` висящее соединение не бросает; окно не появляется, следующий тик наслаивается | нет | нет |

Честный вывод для текстов: клиент умеет сказать «кабинет ответил ошибкой N» (с номером и текстом) **или**
«до кабинета не достучаться» (сеть, прокси или запрет браузера — без различения). Остальное — развилки.

### 3. Слова для оператора (линза Ожегова) — только в одной таблице `lib/connection-fallback/reasonTexts.ts`

Заголовок окна стабилен: **«Сервер недоступен»** (как сейчас). Ниже — класс словами, что делать, затем приглушённо
сырая деталь и время факта.

| Класс (`kind`) | Что говорит окно | Что делать человеку |
|---|---|---|
| `unreachable` (TypeError, сеть/прокси/запрет) | «Связи с кабинетом нет. Запрос не дошёл до сервера.» | «Проверьте интернет и прокси. Если связь есть, а окно повторяется — сообщите нам время с этого экрана.» |
| `server_error` (5xx) | «Кабинет ответил ошибкой N.» (+ текст ответа, если есть) | «Это на стороне сервера. Подождите минуту — проверка повторится сама.» |
| `rate_limited` (429) | «Кабинет просит подождать: слишком много запросов.» | «Ничего не делайте — проверка повторится через минуту.» |
| `forbidden` (403) | «Кабинет отказал в доступе.» | «Возможен запрет по региону или прокси. Проверьте, через какую сеть вы выходите.» |
| `offline` (`navigator.onLine === false`) | «Компьютер не в сети.» | «Подключите сеть — проверка повторится сама.» |
| `unknown` (иное) | «Сервер не ответил ожидаемо.» + сырая деталь | «Сообщите нам время с этого экрана.» |

Приглушённая строка: `HH:MM:SS · <сырая деталь>` (например `09:14:02 · 502 Bad Gateway` или `09:14:02 · Failed to fetch`).
Запрещено в теле окна: имена файлов, `fetch`, `TypeError`, коды проверок. Сырая деталь — одной приглушённой строкой,
как `rawCode` в окне «Буфер полон».

### 4. Поведение: окно не должно дёргать чаще

Сейчас **ни дебаунса, ни порога нет**: первый же отказ опроса (раз в 60 с) открывает окно (`nodeConnectionStore.ts:180-184`),
повторный отказ под деградацией открывает его снова (зуб «повторный разрыв под деградацией снова показывает диалог»).
Спринт частоту **не меняет** — поведение остаётся прежним, меняются только слова. Ввести порог/дебаунс — развилка 1
владельцу, не решается здесь.

### 5. Porcha — красный на стволе (временный файл `usePairStatusMonitor.porcha-2540.test.tsx`, прогнан и удалён)

```
× P1: HTTP 502 от кабинета — lastConnectionError несёт «502», не константу
  → AssertionError: expected 'cabinet unreachable' to contain '502'
× P2: сетевой отказ (TypeError: Failed to fetch) — lastConnectionError несёт текст ошибки
  → AssertionError: expected 'cabinet unreachable' to contain 'Failed to fetch'
```

Базовая линия на стволе: `nodeConnectionStore.test.ts` 11 + `usePairStatusMonitor.test.tsx` 4 — **15/15 зелёные**.

## Блоки

| Блок | Персона | Зона | Оценка |
|------|---------|------|-------:|
| b1 `failure-cause-reaches-window` | vesnin | `api/pairing.ts` (+test, новый) · `hooks/usePairStatusMonitor.ts` (+test) · `stores/nodeConnectionStore.ts` (+test) · `lib/connection-fallback/` (новый: `reasonTexts.ts`, `classify.ts`, `structural.test.ts`) · `ConnectionFallbackDialog.tsx` · `MembranePairingPanel.tsx` | 240 |
| b2 `live-check-closure` | angelina (гейт) | `docs/local-sprint/cabinet-unreachable-cause-2540/` · `docs/LOCAL_SPRINT_ACTIVE.md` · `docs/LOCAL_SPRINT_LOG.md` · `docs/sprint/experience/cabinet-unreachable-cause-2540.segments.json` | 140 |

Порядок: b1 → b2. Зоны не пересекаются. **Точка перерезки — внутри b1** после api+хук+стор: если ради совместимости
строки `lastConnectionError` придётся трогать тесты вне зоны (`createScenarioRuntimeHost.test.ts` задаёт поле напрямую) —
стоп и перерезка, не правка чужого теста молча.

## Прогноз до исполнения

| Блок | Что даст | Чем проверяется | Чем опровергается |
|------|----------|-----------------|-------------------|
| b1 | `fetchPairStatus` бросает ошибку со `status` и текстом тела; хук `catch (err)` → классификатор → `reportConnectionError(failure)`; стор хранит `lastConnectionFailure` (`{source, kind, httpStatus, detail, at}`), `lastConnectionError` остаётся строкой-деталью (совместимость); окно читает слова только из `reasonTexts.ts`; та же строка с ISO-меткой — в журнал оболочки Studio (`writeElectronShellLog('warn', …)`; в браузере `console.warn`) | **P1/P2 зелёные** на ветке, красные на `0eb88efa`; **P3** (резчик): на отказ `writeElectronShellLog` вызван ровно один раз, `warn`, строка с ISO и классом (мок `window.electronAPI.shellLog`); 502 → `server_error`, текст содержит «502»; `TypeError` → `unreachable`, деталь «Failed to fetch»; 429 → `rate_limited`; 403 → `forbidden`; одна строка журнала с ISO на отказ; структурный зуб: литералы только в таблице; 15 старых зубов зелёные | понадобился таймер, повтор, таймаут или смена кнопок — перерезка; тексты расползлись (структурный зуб красный) — не сдан; `MembranePairingPanel` перестал открывать окно при сетевой ошибке сопряжения — не сдан |
| b2 | Живая приёмка владельцем в **dev-Studio** (`MEMBRANA_STUDIO_DEV=1`, прод не трогается): (1) `VITE_CABINET_API_URL=http://127.0.0.1:9` (порт discard, соединение отвергается) → окно «Связи с кабинетом нет» + деталь + время; (2) локальный node-сервер `127.0.0.1:3999`, отдающий 502 с JSON `{message:'upstream down'}` на любой путь → окно «Кабинет ответил ошибкой 502 · upstream down»; обе строки — в `%APPDATA%/Membrana/logs/shell-<дата>.log` с временем, совпадающим с окном | Скриншоты и строки журнала в `CLOSURE.md`; `LOCAL_SPRINT_LOG.md`; `sprint:gate` pass; `sprint:experience` | окно одно и то же для обоих отказов — причина теряется ещё где-то (второй вызывающий переписывает стор?) — стоп и замер, не правка слов |

## BLOCK-условия (резчик)

- **b1:** новая строковая константа вместо причины в любой ветке `catch`; литерал текста класса вне
  `lib/connection-fallback/reasonTexts.ts`; `res.status` потерян (P1 красный); `TypeError.message` потерян (P2 красный);
  запись в журнал без ISO-метки либо два разных текста для окна и журнала; изменено поведение диалога / введён
  дебаунс, порог, таймаут, повтор без слова владельца; новый `setInterval`; сломан путь `MembranePairingPanel` →
  окно при сетевой ошибке сопряжения.
- **b2:** приёмка не показала два **разных** класса словами в dev-Studio без прода; нет строки журнала с временем;
  нет записи в `LOCAL_SPRINT_LOG.md` со снимками.

## Вердикт резчика (vesnin, прогон контекста 02.10 06:20Z)

Конспект — [`cut-cabinet-unreachable-cause-2540-vesnin.md`](../../discussions/cut-cabinet-unreachable-cause-2540-vesnin.md).

- **Контракт годится.** b1 — одна граница (поток fetch → стор → окно несёт причину), b2 — наблюдение человеком без прода.
- **Корень верен, но назван неполно:** точек потери **две**, обе в b1 — (1) `parseError` без `res.status` теряет HTTP-класс,
  (2) `catch {}` хука теряет сетевой класс и склеивает всё в константу. Стор пробрасывает, диалог — литерал; других
  кандидатов замеры не оставили.
- **Неисключённое — CORS в сборке `file://`:** preflight без ACAO означает, что из `loadFile`-сборки fetch мог падать
  `TypeError` **всегда**, и «cabinet unreachable» мог быть не инцидентом, а штатным состоянием сборки. Корень билета это не
  меняет, интерпретацию симптома владельца — меняет. Отдельная запись (развилка 0), в b1 не тащить.
- **`ConnectionFailure` структурный — нужен:** `source`/`kind`/`httpStatus`/`detail` оправданы четырьмя разными решениями
  читателя, `at` — журналом; больше полей — декор. `lastConnectionError` строкой оставить для совместимости.
- **Третий зуб P3 обязателен:** отказ опроса → `writeElectronShellLog` вызван ровно один раз, уровень `warn`, строка с
  ISO-меткой и классом (мок порта `window.electronAPI.shellLog`). Без него журнал — необязательный побочный эффект.
  Структурный зуб единственности таблицы — желателен, по образцу `overflow-window`.
- **Не входит — подтверждено;** добавлено: media-ветку не трогать (та же болезнь, но граница билета — кабинет).
- **Развилки по риску:** CORS в `file://` — первой. ADR и консилиум не нужны — починка потери информации, не смена архитектуры.

Условия резчика влиты: P3 — в DoD b1 и прогноз; развилка 0 — в список ниже.

## Что НЕ входит

- Смена поведения диалога (кнопки, автономный режим, закрытие) — не трогается.
- Повторные попытки, дебаунс, порог показа — развилка 1; в билете «Не входит».
- Таймаут fetch — развилка 2 (сегодня висящее соединение ошибки не даёт вовсе — факт записан, не чинится).
- Коды сети из главного процесса Electron (прокси/DNS/сертификат) через IPC-пробник — развилка 3.
- Опрос media: `pingMediaApi` возвращает `boolean` и глотает причину — текст `'media-server unreachable'` остаётся (развилка 5).
- **CORS-политика кабинета для `Origin: file://` / `null`** (preflight и GET без ACAO) — замер 02.10 закрыл развилку 0:
  сборка сопряжена живым фактом, блокера нет, Issue не заводится (§«Развилка 0»). Кабинет и Caddy не трогаются.
- **Наложение бейджа «Буфер полон» на галку INFO в шапке доски — НЕ этот спринт.**
- Кабинет, Caddy, прод-окружение, тариф и квота — не трогаются.

## Развилки на слово владельца

**Решено 02.10 06:28Z — «Ратифицирую с умолчаниями»:** (1) порог показа окна — как есть; (2) таймаут — не вводить;
(3) коды сети из главного процесса — не в этот спринт; (4) форма строки — класс + что делать + деталь приглушённо + время;
(5) media-ветка — константа остаётся; (6) приёмка — два подстроенных отказа в dev. Развилка 0 — замер до кода (ниже):
посылка опровергнута, Issue не заводится.

0. **CORS в Studio-сборке (резчик — первой по риску).** Preflight кабинета на `Origin: file://` / `null` — без ACAO. Если
   сопряжение в сборке (`loadFile`) не работает вовсе, это блокер релиза, а не наблюдаемость. Живая проверка сборки с
   DevTools до старта b1 (умолчание) или отдельный билет параллельно.
1. **Порог показа окна** — оставить как есть: окно с первого отказа раз в 60 с (умолчание; спринт про наблюдаемость) или ввести N подряд отказов / дебаунс (смена поведения, отдельный блок).
2. **Таймаут опроса** — не вводить (умолчание) или `AbortSignal.timeout` ~15 с с классом «кабинет не ответил за 15 с».
3. **Коды сети из главного процесса Electron** — не в этот спринт (умолчание) или отдельный блок с IPC-пробником `net.fetch` (различит прокси/DNS/сертификат).
4. **Форма строки в окне** — класс словами + что делать + сырая деталь приглушённо + время (умолчание) или только слова.
5. **media-ветка** — оставить константу (умолчание, по билету) или в том же блоке нести причину из `pingMediaApi` (+~40 строк к b1).
6. **Живая приёмка** — два подстроенных отказа в dev-Studio (умолчание) или ждать настоящего транзиента на проде с журналом (по времени не управляемо).

## Развилка 0 — закрыта замером 02.10 (до кода, только чтение)

**Посылка «сопряжение в сборке не работает» — опровергнута** живым фактом владельца: 30.09–01.10 он работал в собранной
Studio (установщики 02c6396a и 00257180), в шапке горело «связан» (это `pingMediaApi` с кастомными заголовками
`X-Membrana-*`), смена тарифа доехала через `/v1/pair/status`. Серверная сторона при этом `file://` не белит:

```
# По коду: GET /v1/pair/status несёт Authorization: Bearer (api/pairing.ts) — заголовок не из безопасного списка,
# preflight по спецификации обязателен; media GET /quota несёт X-Membrana-Token / X-Membrana-Device-Id — тоже.
curl -s -D - -o /dev/null -H "Origin: file://" -H "Authorization: Bearer invalid" https://cabinet.membrana.space/v1/pair/status | grep -i "^HTTP/\|^access-control"
#   HTTP/1.1 401 Unauthorized · Access-Control-Allow-Credentials: true · Access-Control-Expose-Headers: … — БЕЗ Allow-Origin
#   (то же для Origin: null; для Origin: http://localhost:5173 — Allow-Origin отдаётся)
curl -s -D - -o /dev/null -X OPTIONS -H "Origin: file://" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization" https://cabinet.membrana.space/v1/pair/status | grep -i "^HTTP/\|^access-control"
#   HTTP/1.1 204 — БЕЗ Allow-Origin
```

Вывод: renderer Electron на origin `file://` (сборка, `loadFile`) CORS-запрет к этим адресам не применяет — иначе
сопряжение в сборке не жило бы. Блокера нет, Issue не заводится; в b1 класс CORS отдельно не обещается (из renderer он
неотличим от сети). Запись оставлена на случай смены политики Electron или кабинета.

## Исполнение b1 (02.10, ветка `fix/cabinet-unreachable-cause-2540`)

| Прогноз b1 | Исход |
|---|---|
| P1/P2 зелёные на ветке, красные на стволе | **Сошлось.** Ствол 2ff2d18f: P1 `expected 'cabinet unreachable' to contain '502'`, P2 `… to contain 'Failed to fetch'`, P3 `spy … called 0 times` — красные; ветка — 3/3 зелёные (оба прогона 02.10; порча — временный файл, прогнан через `git stash -u`, удалён) |
| 15 старых зубов зелёные | **Сошлось и шире:** зона + соседи **141/141** (хук 9, стор 14, `api/pairing.test.ts` 7, `connection-fallback` 23, `overflow-window` структурные, `createScenarioRuntimeHost`) |
| Окно на 502 — «Кабинет ответил ошибкой 502» + что делать; на TypeError — «Связи с кабинетом нет» | **Сошлось** (`reasonTexts.test.ts`); приглушённо `ЧЧ:ММ:СС · HTTP 502 Bad Gateway` |
| Строка с ISO в shell-log Studio | **Сошлось** (P3: `writeElectronShellLog('warn', '[connection] <ISO> cabinet server_error http=503 · …')`, ровно один вызов) |
| Опровержение: таймер / повтор / таймаут / кнопки | **Не понадобилось** — ни одного |
| Точка перерезки (`createScenarioRuntimeHost.test.ts` вне зоны) | **Не наступила:** тест задаёт стор `setState` частично, новое поле ему не мешает; файл не тронут |
| Оценка 240 строк | **Разошлось вверх:** код 346 (+106 к прогнозу — пояснения в `classify.ts` 116 и `reasonTexts.ts` 100), зубы 545, документы спринта 376; всего на ветке 1267 → `pr:ship` потребовал `--size-reason` (порог 400), причина названа в теле PR #2550: план и код — один контракт, резать по веткам нечестно |

Сверх прогноза: `tsc -b` клиента падал тремя ошибками **чужой зоны** (`refreshQuota`, `readAt` из #2538) — stale dist
`@membrana/media-library-service` от 30.09 при исходниках от 01.10; вылечено `yarn turbo run build
--filter=@membrana/media-library-service --force`, после чего `tsc -b` чист. `eslint` изменённых файлов — чист.
Структурный зуб «одна таблица слов, один вход отказа» сначала ловил слово «catch {}» в комментарии хука — зуб снимает
строчные комментарии перед проверкой.

## b2 — живая приёмка владельцем (инструкция; прод не трогается)

Нужна Studio из ветки (после слияния PR — из `main`), запуск **dev** (`yarn studio:dev` сам ставит `MEMBRANA_STUDIO_DEV=1`
и пробрасывает окружение в Vite: переменная оболочки перекрывает `apps/client/.env.development`). Studio должна быть
**уже сопряжена** (учётные данные живут в `%APPDATA%\Membrana`, переживают перезапуск): если нет — один раз запустить
`yarn studio:dev` без переменных, связать ключом из кабинета, закрыть.

**Опыт 1 — «связи нет»** (порт 9 — discard, соединение отвергается сразу). PowerShell из корня репозитория:

```powershell
$env:VITE_CABINET_API_URL = 'http://127.0.0.1:9'
yarn studio:dev
```
Ожидание ≤60 с после старта (опрос идёт сразу, затем раз в минуту): окно **«Сервер недоступен»** →
«Связи с кабинетом нет. Запрос не дошёл до сервера.» → «Проверьте интернет и прокси…» → приглушённо
`ЧЧ:ММ:СС · Failed to fetch`. Закрыть Studio.

**Опыт 2 — «кабинет ответил ошибкой 502».** Во втором окне PowerShell поднять локальный сервер, отдающий 502 с JSON на
любой путь (с заголовками CORS, иначе dev-renderer на `localhost:5173` увидит не 502, а запрет):

```powershell
node -e "require('http').createServer((q,s)=>{const h={'Access-Control-Allow-Origin':q.headers.origin||'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json'};if(q.method==='OPTIONS'){s.writeHead(204,h);return s.end();}s.writeHead(502,h);s.end(JSON.stringify({message:'upstream down'}))}).listen(3999,'127.0.0.1',()=>console.log('502-сервер на 127.0.0.1:3999'))"
```
В первом окне:
```powershell
$env:VITE_CABINET_API_URL = 'http://127.0.0.1:3999'
yarn studio:dev
```
Ожидание: окно «Сервер недоступен» → **«Кабинет ответил ошибкой 502.»** → «Это на стороне сервера. Подождите минуту…» →
приглушённо `ЧЧ:ММ:СС · HTTP 502 upstream down`.

**Журнал.** Открыть `%APPDATA%\Membrana\logs\shell-<ГГГГ-ММ-ДД>.log` — две строки вида
`[renderer] [connection] 2026-10-02T…Z cabinet unreachable · Failed to fetch` и
`… cabinet server_error http=502 · HTTP 502 upstream down`; время в строке совпадает с временем на экране.

**Сдача b2:** снимки двух окон и две строки журнала — в `CLOSURE.md` этого каталога и запись в `docs/LOCAL_SPRINT_LOG.md`;
затем `yarn sprint:gate` и `yarn sprint:experience`. Если оба окна одинаковые или строк в журнале нет — стоп и замер
(вторая точка потери), не правка слов.

**Вернуть окружение:** `Remove-Item Env:VITE_CABINET_API_URL` (или закрыть окно PowerShell); 502-сервер — Ctrl+C.

## Что неизвестно

- Какой именно отказ был 01.10 — журнала тогда не было (его и заводит b1); после слияния любой повтор оставит строку с
  временем в `shell-<дата>.log`, сопоставимую с логами Caddy кабинета.
- Отдаёт ли Caddy кабинета HTTP/2 Chromium-клиенту (curl получил HTTP/1.1): при HTTP/2 `statusText` пуст — потому статус
  несётся числом (`HttpResponseError.status`), не словом; зуб «502 с HTML-телом и пустым statusText» это закрепляет.

## Не one shot

Меняется контракт стора соединения (тип отказа вместо строки), заводится модуль текстов со структурным зубом по образцу
`overflow-window`, трогаются api/хук/стор/диалог/панель сопряжения; живая приёмка владельцем и ратификация. Малым
намерением с одним ревью-атомом это не является.
