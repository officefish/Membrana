# Сторож диска (Д1) — `[disk-alarm]` напрямую в телеграм

> Кусок A магистрали наблюдаемости · Issue [#2118](https://github.com/officefish/Membrana/issues/2118)
> Вердикт комнаты: [`m1c-disk-guard`](../../docs/seanses/logging-observability-cut-m1c-disk-guard-2026-08-24.md) ·
> задание: [`EPIC.md`](../../docs/meeting/logging-observability-cut/EPIC.md), кусок A.

Свободное место тома записи проверяется каждые 5 мин; при остатке меньше 60 мин записи —
тревога **прямым** запросом в Telegram Bot API со своим токеном. Офис — только запасной
путь после отказа прямого (офис-first запрещён: офис транзиентно таймаутит, тревога через
него умирает вместе с ним). Sibling-таймер на том же хосте ловит тишину самого сторожа
(порог 15 мин) — тишина не означает «всё хорошо».

Достижимость `api.telegram.org` с хоста media/кабинета **замерена 24.08.2026**: 302 за
30–50 мс, стабильно; Bot API отвечает ([#2118, комментарий](https://github.com/officefish/Membrana/issues/2118#issuecomment-5393608442)).
Прямой путь объявлен рабочим этим замером (условие вердикта M1c снято).

## Состав

| Файл | Что |
| --- | --- |
| `disk-watchdog.sh` | сторож места: df → T_remain → решение → доставка; режимы `compute`/`b-floor`/`decide` — чистые формулы для тестов |
| `disk-watchdog-sentinel.sh` | сторож сторожа: возраст `last_ok_ts` > 15 мин → `[disk-watchdog-stale]` |
| `disk-watchdog-lib.sh` | общая обвязка: формулы, транспорт direct→office, троттлинг |
| `systemd/*.timer, *.service` | таймеры по 5 мин; **без** зависимостей от docker/сборщиков (Д1) |
| `install.sh` | установка на хост — запускает ВЛАДЕЛЕЦ, агент прод не трогает |

Тесты: `scripts/disk-watchdog.test.mjs` (DoD-предикаты A/B/C/F — без сети, через
`DW_SEND_MODE=print` и подмену часов/df).

## План раскладки секрета (руками владельца, в репозиторий не попадает)

1. Создать бота у @BotFather (или взять существующего служебного), получить токен.
   Токен ОФИСА не переиспользовать — у сторожа свой (вердикт M1c).
2. Узнать chat id получателя тревог (личный чат владельца или служебная группа —
   НЕ союзническая группа).
3. На хосте media/кабинета:

   ```bash
   sudo mkdir -p /etc/membrana
   sudo tee /etc/membrana/disk-watchdog.env >/dev/null <<'EOF'
   DISK_WATCHDOG_TG_TOKEN=<токен бота>
   DISK_WATCHDOG_TG_CHAT_ID=<chat id>
   DW_WATCH_PATH=/
   # DW_OFFICE_TOKEN=<OFFICE_API_TOKEN>   # опционально: включает fallback через офис
   EOF
   sudo chmod 600 /etc/membrana/disk-watchdog.env
   ```

4. Из чекаута репо на хосте: `sudo deploy/disk-watchdog/install.sh`.
5. Проверка: `sudo /opt/membrana/disk-watchdog/disk-watchdog.sh run` →
   `tail /var/lib/membrana-disk-watchdog/journal.log` (ожидаемо `level=ok`).
   Живую доставку проверить разово: `DW_T_CRIT_MIN=100000 sudo -E /opt/membrana/disk-watchdog/disk-watchdog.sh run`
   (искусственно занизить порог → придёт тревога → вернуть как было).

**Оговорка fallback:** единственный телеграм-канал офиса сегодня — `/v1/telegram/ally-message`
(союзническая группа). Пока это так, включённый `DW_OFFICE_TOKEN` означает, что запасная
тревога уйдёт союзникам. По умолчанию fallback ВЫКЛЮЧЕН (переменная не задана) — тогда
отказ прямого пути даёт `failed_both` в журнале и красный oneshot в systemd. Отдельный
служебный канал офиса — кандидат куска E, не этого.

## Конфиг (env, все имеют умолчания)

| Переменная | Default | Смысл |
| --- | --- | --- |
| `DW_WATCH_PATH` | `/` | том записи |
| `DW_T_CRIT_MIN` | 60 | тревога crit: осталось меньше N минут записи |
| `DW_T_WARN_MIN` | 180 | предупреждение warn |
| `DW_WRITE_RATE_REF_MB_MIN` | 10 | опорная скорость записи, МБ/мин — **завышенный default до калибровки** |
| `DW_MIN_OBS_MIN` | 30 | окно, после которого включается скользящая оценка вместо опорной |
| `DW_REALARM_MIN` | 30 | не чаще одной тревоги уровня в N минут |
| `DW_T_SILENCE_MIN` | 15 | порог тишины сторожа для sentinel |
| `DW_STATE_DIR` | `/var/lib/membrana-disk-watchdog` | состояние: history, журналы, `last_ok_ts` |

## Калибровка `write_rate_ref` (вердикт M1c: замер ≥ 30 мин)

Во время живой записи дать сторожу поработать ≥ 30 мин и посмотреть журнал:
`grep src=sliding /var/lib/membrana-disk-watchdog/journal.log | tail -5` — поле `rate=`
(байт/мин). Записать консервативное (округлённое вверх) значение в
`DW_WRITE_RATE_REF_MB_MIN`. Ночь 23.08 писала ~1 МБ/мин (525 МБ за 99,5 мин) — default 10
завышен сознательно: до калибровки сторож перестраховывается.

Ориентир на 24.08: том 48 ГБ занят на 76 %, свободно 12 ГБ (замер в #2118).

## Словарь исходов (журнал `journal.log`)

`ok_no_alarm` · `sent_direct` · `sent_via_office` · `failed_both` (exit 1, красный
oneshot) · `skipped_no_token` · `skipped_throttled`.
