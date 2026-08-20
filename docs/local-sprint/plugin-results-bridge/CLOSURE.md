# Membrana Local Sprint CLOSURE: plugin-results-bridge

| Поле | Значение |
|------|----------|
| Sprint | `plugin-results-bridge` (фаза эпика `server-plugin-foundation`, #1961) |
| PR | [#1981](https://github.com/officefish/Membrana/pull/1981) b1+b2 (office, `18ba21c4`) · [#1985](https://github.com/officefish/Membrana/pull/1985) b3 (media, `ca07071f`) · [#1988](https://github.com/officefish/Membrana/pull/1988) b4 (media+handlers, `293f77d9`) — все MERGED 19.08 |
| Гейт исполнения | 5/5 `honest_pair` (b5 закрыт 20.08 после деплоя и перерезки окна, ратифицированной владельцем) |
| Опыт (ADR-0026) | `vesnin-plugin-results-bridge-cut-1` · hit · точность нарезки 100% (5/5), переполнений 0; факт: b1 72 · b2 292 · b3 195 · b4 304 · b5 44 против прогноза 80/220/220/260/70 |
| Статус | **closed 20.08** — b5 принят после деплоя 19.08 вечера: runId 01a01ac2-…, bridge sent; гейт 5/5, журнал pass, карточка архивирована |

## Итог

Провод media → office для результатов плагинов есть в стволе целиком:
форма (HTTP push, обоснование против очереди/прямой Mongo/pull) · приёмник
`POST/GET /plugin-results/runs` в office (zod-DTO выводится в контракт, идемпотентность у
дома) · отправитель `PluginResultsBridgeService` в media (исходы `sent ·
office-not-configured · office-unreachable · office-rejected`, одна+одна попытка) · вход
`POST …/collections/:id/plugins/:pluginId/request` в media (контекст из deps исполнителя, runId
UUID v7, повод из подписки манифеста, заглушки 501) · сид `onResult` → мост, исход моста в ответе.

**Не вышло — b5.** Ни один `RunRecord` через HTTP-путь ещё не лёг: оба прода на старом
коде (404 на новых входах, проверено 19.08 13:20 МСК), локальной дорожки нет (ни Postgres,
ни Docker). Прод-деплой office → media + `OFFICE_API_URL`/`OFFICE_API_TOKEN` в
`/etc/membrana/media.env` — слово владельца. Команды прогона и чтения обратно — в
`docs/plugins/results-bridge-live-run-2026-08-19.md`; после деплоя блок закрывается одним
`curl` и одной записью результата.

## Ревью-хроника

- #1981: 8 раундов (BLOCK → LGTM): env-контракт media машинно (B8), зуб «валидация pluginId
  в службе до стора», follow-up #1982 (passthrough → карман payload) карточкой реестра, зуб
  полноты `HOME_NAMES` с отрицательной проверкой, строка приёмника в LIVE_SERVICES.md,
  исключение bare-fetch для моста в политике машин (pre-push), `limit>0` назван в типе.
- #1985: LGTM с первого раунда. #1988: LGTM с первого раунда.

## Открытые вопросы Архитектору (не код)

1. #1982 — `passthrough` полей исполнителя в приёмнике vs карман `payload` в `RunResult`.
2. Ключ идемпотентности запроса (`requestId`) и `depsSnapshotId` в `RunRecord` — предложение
   Дынина (b4); отклонено в спринте как расширение словаря M1/M3′; повтор `request` сегодня —
   новый детерминированный прогон, дом идемпотентен по `runId`.
3. Авторизация «какой токен за какой плагин пишет» — вне предмета (M5′), до второй волны.

## Остаток эпика #1961

- Деплой и b5 (этот спринт, ждёт слова).
- Закрытие эпика — после живого провода без скрипта.
