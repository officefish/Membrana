<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-11-21T11:45:52.896Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/device-recording-sessions-m3-machine-2026-11-21.md` |
| Порядок ролей | Музыкант → Структурщик → Математик → Верстальщик → Архитектор → Teamlead |
| Повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 9728 | `6f75fc0fcbb1` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 9728 · 1 п. | `6f75fc0fcbb1` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --min-replies 30`

**Вопрос:**

Заседание «Политика сессий записи прибора», M3 прогон 2: Q3 — машина сессии

---

# Консилиум: M3 — машина сессии записи прибора (прогон 2)

**Повестка:** Q3 — кто будит конец/открытие сессии, чем выборка и доказанное освобождение остатка, как прибор узнаёт и снимает удержание, сбой/повтор; обязательные ж–м.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Структурщик → Математик → Верстальщик → Архитектор → Teamlead

---

[Музыкант]: С потока артефактов: буфер — это живая лента прибора, не архивная партия. После сессии лента должна быть физически пуста (Т4), иначе удержание на приборе и `device_buffer_full` останутся в вечной петле. Снятие `release('cleanup')` сейчас слушает только студийный `bufferCleared` — серверного сигнала в стволе нет; значит либо расширяем уже существующий опрос квоты, либо врём себе про push.

[Структурщик]: Словарь прежде кода. `buffer-cleanup` — лемма ручной очистки: `MediaDeviceAccessGuard`, plan `oldest|newest` × {20,50,100,200}, execute без proof, отказ помеченным (`buffer-cleanup.service.ts:139-141`). Это **не** машина сессии. Сессионное закрытие — отдельный runner в media рядом с `PurgeGcRunner`, со своим журналом шагов, без двери «покажи список человеку». Слово владельца: включение сессии = разрешение на удаление остатка.

[Математик]: Инвариант освобождения численно однозначен: после закрытия `count(__buffer__ ∩ deviceId) = 0`, и для каждого пути остатка `rmResult ∈ {removed, already_absent}`, `existsAfter = false`. `blobs.delete` / `rm force` этого не даёт — только `removeWithProof` (`blob-removal-proof.ts:22`, зов из `purge-gc.runner.ts:174`). «Подтверждено» = конъюнкция: (а) все id остатка имеют proof-успех, (б) повторный count буфера прибора = 0, (в) выборка и keep-marked больше не числятся в `__buffer__`.

[Верстальщик]: Человеку в паузе нужно честное состояние, не спиннер: «сессия закрыта, ждём освобождения буфера» / «освобождение не подтвердилось» + явное действие «повторить освобождение». Ручная очистка буфера по-прежнему со списком — сессионное удаление списка не показывает. Индикатор удержания на приборе гаснет только когда клиент реально снял hold по факту пустого буфера, не по «конец окна».

[Архитектор]: Граница как у ADR-0032: media **не** имеет `@Cron` (grep пуст) — будильник по сроку = часы **офиса** будят HTTP-дверь media; media исполняет и пишет журнал. Свой scheduler внутри media ломает принятую границу «office будит / media владеет байтами». Досрочное закрытие по `device_buffer_full` — не cron: тот же media-path отказа приёма инициирует попытку close. Итого два входа в одну машину close, один lock.

[Teamlead]: Планка прогона 1 ясна: не тащить buffer-cleanup, не выдумывать server→device push, буфер после close пуст, будильник — решение M3, гонка входов и Д1 замка — в вердикте. Связка: Веснин форма → Ожегов runner/API → Дынин предикаты proof/идемпотентность → Курёхин порядок blob и hold → Родченко пауза/ручной выход. M4 папку не трогаем. Работаем.

[Музыкант]: Выборка по критерию: в стволе уже `modeOrderOf` / `modeOrder` после `handlers.measureSampleSet` (`downgrade-archive.service.ts:238-260`). Критерии сессии — те же ордера, не третий ранжировщик. Помеченные «хранить» **не** участвуют в лимите `selectionLimit`: они объединяются с top-N **после** ранжирования и уходят из `__buffer__` вместе с выборкой (слово «А»). Остаток — всё, что в окне сессии и не вошло в этот keep-set.

[Структурщик]: Куда на шаге M3 уходят keep-set из `__buffer__`: **смена membership** пробы — sample покидает коллекцию `__buffer__` и становится library-owned (id список на сущности сессии: `selectedIds`, `retainedKeepIds`). Устройство папки/кольца — M4; здесь достаточно: row + blob ref больше не buffer-quota. Не оставлять «выбранные» строками в `__buffer__` — это и был провал прогона 1 против Т4.

[Математик]: Отказ измерителя (к): `measureSampleSet` может вернуть `refusal` на подмножество. Правило: измеренные ранжируются `modeOrder`; неизмеренные **не** входят в top-N по критерию (нет ключа порядка). Human-keep всё равно в keep-set. Если отказ измерителя **тотальный** на ненулевом кандидате без единой метрики и `selectionLimit > 0` — close не подтверждает выборку: сессия → `pause_measure_failed`, буфер не трогаем удалением вслепую, человеку — повтор. Частичный отказ ≠ тотальный.

[Верстальщик]: Ручной выход из паузы — не «сделать вид, что буфер пуст». Кнопка «Повторить освобождение» = тот же idempotent close/resume runner. Отдельная «Снять паузу без очистки» в v1 не даём: иначе Т4 и hold расходятся с фактом на диске. Если `enabled=false` в паузе — runner всё равно обязан добить освобождение, затем не открывать next.

[Архитектор]: Канал (и) — **один**, существующий: опрос прибора `GET /v1/devices/:deviceId/quota` (`pairing.ts:115`, `usePairStatusMonitor.ts:45`). Расширяем ответ квоты полями машины сессии: `bufferEmpty: true` **и/или** `session.liberationConfirmedAt` / `holdRelease: 'cleanup_allowed'`. Нет WebSocket у media; «рассылка контекста» — cabinet→media, не device; hub — шина браузера. Новый push не вводим без причины: poll уже есть, hold снимаем когда quota говорит «буфер сервером пуст».

[Teamlead]: Принимаю канал = quota poll only. Момент: client после poll видит пустой буфер/флаг → публикует тот же контур, что студия, либо напрямую `release('cleanup')` по серверному факту — без фейкового `publishMediaLibraryBufferCleared` от локальной очистки. Курёхин стыкует wiring. Дальше — residual delete.

[Музыкант]: Порядок байт как у live-purge: сначала зафиксировать keep-set и residual ids в журнале сессии (snapshot), **перевести** keep-set из `__buffer__`, затем `removeWithProof` по residual. Обратный порядок рискует удалить то, что ещё не «ушло» в library-учёт. Студийный clear не вызываем.

[Структурщик]: Переиспользуем: `modeOrder*`, `measureSampleSet`, `BlobStorageService.removeWithProof`, идея journal run/job как у purge. **Не** переиспользуем: `buffer-cleanup` plan/execute, `blobs.delete` без proof, `PURGE_LIVE_ENABLED` как единственный ключ — у сессии свой `SESSION_BUFFER_PURGE_LIVE_ENABLED` (имя уточнит env), причина: боевое уничтожение ленты прибора не должно включаться «включённым архивным GC» и наоборот. Замок процесса — тот же паттерн «один active live close», отдельный mutex от `PurgeGcRunner`, чтобы archive-gc и session-close не делили один boolean вслепую.

[Математик]: Идемпотентность: close run имеет состояния `planned → selecting → moving_keep → purging_residual → verifying → confirmed | pause_failed`. Повтор с тем же `sessionId` + `closeAttempt` продолжает с незавершённого шага; `already_absent` на residual = успех id; move keep повторно — no-op если sample уже не в `__buffer__`. Второе входное close, когда run уже `selecting…verifying`, получает `409 conflict` / `accepted_noop` с причиной первого. Победившая `closeReason` — **первая успешно записанная** в journal (deadline | buffer_full | policy_disabled | policy_changed | manual_resume).

[Верстальщик]: Серия `device_buffer_full` в UI/логах: в состоянии `closing` и `pause_*` прибор продолжает получать отказ приёма (буфер ещё может быть полон), но **не** спамим новые close attempts — media гасит триггер «full → close», пока live run активен или pause ждёт resume. Человеку один badge паузы, не мигание причин.

[Архитектор]: Гонка (л): три входа — (1) office tick «deadline reached», (2) inline из refusal `device_buffer_full`, (3) manual resume из паузы. Все три зовут `SessionCloseRunner.requestClose(sessionId, reason)`. First-writer-wins на переходе `open → closing`. Вход (2) в `pause_*` **не** меняет reason и не стартует второй purge; отказ full в паузе = ordinary overflow, к закрытию не относится. Manual resume переводит `pause → closing` с reason `manual_resume` (или сохраняет исходную closeReason + resume flag — фиксирую: **исходная closeReason сохраняется**, resume — отдельный `trigger=manual`).

[Teamlead]: Зафиксировали first-wins + full в паузе не reopen. Будильник: офис cron. Частота?

[Музыкант]: Минимальная сессия 30 мин. Тик раз в 60с достаточен: опоздание конца ≤1 мин относительно серверного `closedAt` deadline — для ленты прибора приемлемо. Не плодим `@Interval` в media. Досрочный full не ждёт тика.

[Структурщик]: Дверь office→media по образцу cold-archive-sweep: internal POST «tick sessions» / per-device inspect. Media сам сравнивает `now` (сервер) с `startedAt+duration` и open-сессии. Office не считает состав буфера. Открытие **следующей** сессии — только в ветке `liberation confirmed` того же runner (или отдельный open после verify), не отдельным cron «наугад».

[Математик]: «Подтверждено» ещё раз: verify-шаг = `∀ residual: proof ∈ {removed, already_absent}` ∧ `buffer_count(device)=0` ∧ keep-set ids ∉ `__buffer__`. Любой `failed` proof → run `pause_purge_failed`, next session **не** открывать (M2). Partial move без verify — тоже не confirmed.

[Верстальщик]: Пауза видима в кабинете/device-board: статус сессии + lastError (measure|purge|verify). Ручной выход = resume trigger; копирайт «Удалить остаток и продолжить», не «Игнорировать».

[Архитектор]: (м) Несколько процессов media: замок **процесса** на live session-close, как PurgeGcRunner `:16`. Боевой ключ session-purge live ⇒ **запрет второй реплики** media тем же долгом, что ADR-0032 Д1 (расширяем формулировку: не только archive purge, а любой live rm proof в media). Sticky/single-instance — ops-норма, не «распределённый lock в v1».

[Teamlead]: Ключ боевого — **свой**, не `PURGE_LIVE_ENABLED`. Д1-запрет реплики — на весь класс live proof-delete в media. LGTM на форму, если вердикт закроет ж–м без M4.

[Музыкант]: Защита помеченных при residual: human-keep уже в keep-set → **не** в residual. Ручная buffer-cleanup по-прежнему отказывает keep и требует list — сессионный runner list не показывает, но keep не удаляет. Контракты не смешивать в одном service method.

[Структурщик]: Результат выборки на шаге M3 пишется в **серверную сущность сессии** (M2): поля `closeReason`, `closedAt`, `selectedSampleIds`, `retainedKeepIds`, `residualIds`, `liberationStatus`, `closeRunId`. Не в `__buffer__`, не в «папку» (M4). Журнал run/jobs — append-only рядом (session-close-journal), proof outcomes на job residual.

[Математик]: Повтор после сбоя mid-close: клиент/office может дернуть tick снова; runner идемпотентен по `closeRunId`. Нет «начислить вторую выборку». Если keep уже moved, residual partially purged — continue residual only. Критерий top-N пересчитываем **только** если ещё не зафиксирован snapshot keep/residual в journal (шаг planned→selecting атомарно снапшотит ids).

[Верстальщик]: Прибор: после `holdRelease`/empty в quota — снять полосу удержания, снова писать. Пока pause на сервере и буфер не empty — hold остаётся; это согласовано с M2 «конец окна hold не снимает».

[Архитектор]: Итоговая конструкция машины: **SessionCloseRunner** в `background-media`; wake deadline = **office cron ~1 min UTC**; early = refusal path `device_buffer_full`; execute = measure → modeOrder → snapshot ids → move keep out of `__buffer__` → residual `removeWithProof` → verify → maybe open next; device notify = **quota poll**; live key = **session-own**; lock = process + single replica. Buffer-cleanup не в графе.

[Teamlead]: Вердикт ниже. Все роли — на «Принимаю» по таблице. M1/M2 не открывали; M4 не решали. Прогон 1 дыры закрыты по имени.

[Музыкант]: Принимаю: порядок blob/keep/residual и quota как единственный signal hold-release.

[Структурщик]: Принимаю: отдельные леммы runner/journal/env; buffer-cleanup снаружи.

[Математик]: Принимаю: предикат confirmed, идемпотентность run, partial vs total measure refusal.

[Верстальщик]: Принимаю: пауза видима, manual = resume only, hold с серверного empty.

[Архитектор]: Принимаю: office wake, media execute, граница ADR-0032, канал quota, Д1 на live proof.

[Teamlead]: Принимаю. Матч — вердикт с посылками и DoD. Запись.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Кто будит конец и open next | **Часы офиса** (`@Cron` UTC) по образцу ADR-0032 cold-archive-sweep → internal tick в media. **Не** scheduler в media (фоновых cron в media нет). Open next **только** после `liberationStatus=confirmed` в том же контуре media. |
| Частота | **Каждые 60 с** (min session 30 мин ⇒ макс. опоздание дедлайна ~1 мин). Досрочный full **не** ждёт тика. |
| Досрочный `device_buffer_full` | Refusal path media (`buffer-overflow-refusal`) вызывает `SessionCloseRunner.requestClose(..., buffer_full)`. |
| Выборка | Переиспользовать `measureSampleSet` + `modeOrder`/`modeOrderOf`. Keep-marked ∪ top-`selectionLimit`. |
| (к) Отказ измерителя | Частичный: без метрики → не в top-N; human-keep сохраняется. Тотальный при `selectionLimit>0` → `pause_measure_failed`, residual **не** сжигать. |
| (ж) Куда уходят keep+выборка | **Исходят из `__buffer__`** (смена membership / library-owned на сервере); ids фиксируются на **сущности сессии**. Папка/кольцо — **M4**. После шага буфер прибора пуст. |
| (з) Residual с proof | `BlobStorageService.removeWithProof` (как purge-gc); **не** buffer-cleanup execute / `blobs.delete`. Journal session-close. Human-keep не в residual. Ручной cleanup — прежний контракт со списком. Слово владельца: session enabled ⇒ разрешение удалять residual без показа списка. |
| Куда результат выборки (M3) | Поля сессии + journal run (`selectedSampleIds`, `retainedKeepIds`, `residualIds`, …). |
| «Подтверждено» | ∀ residual proof ∈ {removed, already_absent} ∧ `buffer_count(device)=0` ∧ keep ids ∉ `__buffer__`. |
| (и) Канал прибору | **Один: существующий poll `GET .../quota`**, расширенный флагом освобождения / empty buffer. Нет media WS; context broadcast ≠ device; hub ≠ server push. Client → `release('cleanup')` по серверному факту. |
| Сбой/повтор | Идемпотентный `SessionCloseRunner` + journal states; snapshot ids до purge; resume с шага. |
| (л) Гонка входов | First successful `open→closing` wins; `closeReason` первой записи. Поздние входы — noop/conflict. Full-серия гасится в `closing`/`pause_*`. Full в паузе ≠ новый close. Manual resume = trigger, reason исходного close сохраняется. |
| Ручной выход из паузы | Только **повтор освобождения** (resume runner), не «снять паузу без очистки». |
| Боевой ключ | **Свой** env (`SESSION_BUFFER_PURGE_LIVE_ENABLED` или эквивалент), **не** `PURGE_LIVE_ENABLED`. |
| (м) Несколько media | Process lock на live session-close; при live proof-delete — **запрет второй реплики** (расширение долга Д1 ADR-0032). |
| Что не переиспользуем | buffer-cleanup plan/execute целиком; `blobs.delete` без proof; выдуманный server→device push. |

### Список посылок

1. **норма** · Данности · Т4 / буфер пуст после сессии  
   [Teamlead]: «не тащить buffer-cleanup, не выдумывать server→device push, буфер после close пуст, будильник — решение M3, гонка входов и Д1 замка — в вердикте.»

2. **норма** · Данности · M2: next только после подтверждённого освобождения; hold не с конца окна  
   [Верстальщик]: «Индикатор удержания на приборе гаснет только когда клиент реально снял hold по факту пустого буфера, не по «конец окна».»

3. **норма** · Данности · M2 отдал будильник M3; часы = сервер  
   [Архитектор]: «Свой scheduler внутри media ломает принятую границу «office будит / media владеет байтами».»

4. **факт** · Фактура · media без @Cron; office cron уборщика  
   [Архитектор]: «Граница как у ADR-0032: media **не** имеет `@Cron` (grep пуст) — будильник по сроку = часы **офиса** будят HTTP-дверь media; media исполняет и пишет журнал.»

5. **факт** · Фактура · buffer-cleanup непригоден (нет proof, guard, oldest/newest×N, отказ keep)  
   [Структурщик]: «`buffer-cleanup` — лемма ручной очистки: `MediaDeviceAccessGuard`, plan `oldest|newest` × {20,50,100,200}, execute без proof, отказ помеченным (`buffer-cleanup.service.ts:139-141`). Это **не** машина сессии.»

6. **факт** · Фактура · proof удаления только у уборщика / `removeWithProof`  
   [Математик]: «`blobs.delete` / `rm force` этого не даёт — только `removeWithProof` (`blob-removal-proof.ts:22`, зов из `purge-gc.runner.ts:174`).»

7. **факт** · Фактура · `modeOrder` + measure перед ранжированием  
   [Музыкант]: «в стволе уже `modeOrderOf` / `modeOrder` после `handlers.measureSampleSet` (`downgrade-archive.service.ts:238-260`).»

8. **факт** · Фактура · прибор poll quota; нет WS media; нет сигнала server freed  
   [Архитектор]: «Канал (и) — **один**, существующий: опрос прибора `GET /v1/devices/:deviceId/quota` (`pairing.ts:115`, `usePairStatusMonitor.ts:45`).»

9. **факт** · Фактура · `release('cleanup')` только от `bufferCleared` студии  
   [Музыкант]: «Снятие `release('cleanup')` сейчас слушает только студийный `bufferCleared` — серверного сигнала в стволе нет; значит либо расширяем уже существующий опрос квоты, либо врём себе про push.»

10. **норма** · Слово владельца · session enabled = разрешение удаления residual без списка  
    [Структурщик]: «Слово владельца: включение сессии = разрешение на удаление остатка.»

11. **норма** · Слово владельца «А» · human-keep → библиотека сверх selectionLimit; буфер пуст  
    [Музыкант]: «Помеченные «хранить» **не** участвуют в лимите `selectionLimit`: они объединяются с top-N **после** ранжирования и уходят из `__buffer__` вместе с выборкой (слово «А»).»

12. **факт** · Фактура · замок процесса purge + Д1 вторая реплика  
    [Архитектор]: «(м) Несколько процессов media: замок **процесса** на live session-close, как PurgeGcRunner `:16`. Боевой ключ session-purge live ⇒ **запрет второй реплики** media тем же долгом, что ADR-0032 Д1»

13. **факт** · Фактура · `device_buffer_full`  
    [Архитектор]: «Досрочное закрытие по `device_buffer_full` — не cron: тот же media-path отказа приёма инициирует попытку close.»

14. **норма** · Вердикт M1 (не переоткрываем) · policy доставляется рассылкой контекста cabinet→media  
    [Архитектор]: «Нет WebSocket у media; «рассылка контекста» — cabinet→media, не device; hub — шина браузера.»

15. **план** · Вопрос M3 / объединяющее задание · переиспользовать ствол, новое только с причиной  
    [Структурщик]: «Переиспользуем: `modeOrder*`, `measureSampleSet`, `BlobStorageService.removeWithProof`, идея journal run/job как у purge. **Не** переиспользуем: `buffer-cleanup` plan/execute, `blobs.delete` без proof, `PURGE_LIVE_ENABLED` как единственный ключ»

---

## Definition of Done

- [ ] `SessionCloseRunner` + journal states в `background-media`; process lock; own live env flag.
- [ ] Office `@Cron` ~60s UTC → tick open sessions by server `now` vs deadline; open next only if liberation confirmed.
- [ ] Inline `requestClose` from `device_buffer_full` refusal; first-wins race; suppress re-entry in closing/pause.
- [ ] Selection: measure + `modeOrder`; union human-keep; snapshot ids on session entity; move out of `__buffer__` before residual proof-rm.
- [ ] Residual only via `removeWithProof`; verify predicate; else visible pause + manual resume = same runner.
- [ ] Total measure refusal → pause, no blind residual delete.
- [ ] `GET quota` (or same device poll door) returns liberation/empty signal; client `release('cleanup')` on that fact.
- [ ] buffer-cleanup API behaviour unchanged for manual path; session path does not call it.
- [ ] Docs: ADR delta on session machine + extend D1 to session live proof-delete single-replica.
- [ ] Tests: idempotent resume mid-purge; empty buffer post-close; keep not deleted; second close noop; full-in-pause no new reason.

---

*Реплик в диалоге: 51; каждый участник высказался не менее одного раза.*
