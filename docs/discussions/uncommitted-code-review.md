<!-- Сгенерировано: 2026-07-08T10:31:22.660Z (yarn code-review; uncommitted) -->

Tier: T1

[Teamlead]: Tier T1 (одиночный пакет `background-cabinet`, runtime auth/presence — но не core/registry, поэтому не авто-T2). PR size OK (~38 lines). Изменение точечное: `registerNode` освежает `lastSeenAt` при реконнекте до первого heartbeat — обоснованный хвост PL2b/TD2. Fire-and-forget с `.catch` + `logger.warn` — корректный выбор, WS-connect не блокируется. Границы пакета соблюдены, диффа для `recordPresenceHeartbeat` не видно — предполагаю, что метод уже существует (см. вопрос Структурщику). **Вердикт: LGTM** после зелёного `yarn turbo run typecheck test --filter=@membrana/background-cabinet`.

[Структурщик]: C1/C3/C4 — ок, всё внутри модуля `node-realtime`, прямых зависимостей не добавлено. C7 — тесты рядом, покрыты обе ветки (с `mediaDeviceId` и без). **P2 (проверить, не блокер):** `recordPresenceHeartbeat` вызывается, но его определения нет в diff — убедись, что метод существует в текущем файле и идемпотентен относительно heartbeat PL2b (двойной вызов при реконнекте+heartbeat не должен ломать логику). Дедупликация `updateMany where: { mediaDeviceId }` выглядит безопасной.

[Математик]: correctness — early return `if (!meta.mediaDeviceId) return;` стоит **до** нового кода, поэтому пустой id не долетает до БД, и тест `без mediaDeviceId не трогает БД` это фиксирует. Тест реконнекта использует `setTimeout(r, 0)` для дренажа микротаск-очереди fire-and-forget — приемлемо, но хрупко при переходе на реальные промисы; opportunity (P2): дождаться через flush явно, если появятся флаки. Error path покрыт `.catch` — ошибка БД не всплывает наружу.

[Музыкант]: —

[Верстальщик]: —

Итоговый артефакт: 2 файла в `packages/background-cabinet/modules/node-realtime` (сервис + тесты), 38 строк.
Definition of Done: `yarn turbo run lint typecheck test --filter=@membrana/background-cabinet`
Риски: P2 — подтвердить наличие/идемпотентность `recordPresenceHeartbeat` (Структурщик); P2 — потенциальная хрупкость `setTimeout(0)` в тесте fire-and-forget (Математик). P0/P1 — нет.
Вердикт: LGTM (после зелёного CI пакета; ни один P2 не блокирует)

Примечание вне scope: коммит этого diff не отменяет ФАЗУ 0 из MAIN_DAY_ISSUE — снимок `docs/archive/daily-day/2026-07-07/` всё ещё нужно закоммитить отдельно, чтобы дерево было чистым для deploy-preflight.