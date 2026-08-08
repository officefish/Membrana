# Прецедент: пять зависших review-вызовов EPIC `static-mmbrn-container`

<!-- precedent-meta
{
  "id": "2026-08-08-static-mmbrn-epic-review-five-agent-hangs",
  "date": "2026-08-08",
  "class": "session-report",
  "symptom": "Пять независимых review-вызовов EPIC остались running и не вернули findings или verdict",
  "rootCause": "Все пять agent runtime не завершили review до timeout и были остановлены; инфраструктурная причина не измерена",
  "fix": "После 5/5 председатель прекратил вызовы, собрал локальный audit из carrier M1-M7 и раскрыл владельцу отсутствие independent LGTM",
  "canonicalCause": "Все пять agent runtime не завершили review до timeout и были остановлены; инфраструктурная причина не измерена",
  "prevention": "Держать потолок пяти вызовов, сохранять agent ids и состояния, не считать молчание LGTM и после потолка выпускать честный local audit",
  "actionItems": [
    {"text": "Разобрать зависание multi-agent review runtime по пяти сохранённым agent ids", "owner": "ozhegov", "status": "open"},
    {"text": "Не закрывать independent-review checkbox локальным PASS", "owner": "vesnin", "status": "done"}
  ],
  "related": ["2026-08-08-static-mmbrn-m7-five-external-runs-local-synthesis"]
}
-->

| Поле | Значение |
|---|---|
| Дата | 2026-08-08 |
| Предмет | независимое предметное ревью итоговой сборки заседания |
| Потолок | 5 попыток, затем локальная вёрстка из доступных материалов |
| Исход | 5/5 зависли в `running`, ни один не вернул finding или verdict |

## Вызовы

| Попытка | Назначение | Agent id | Последнее состояние | Выход |
|---|---|---|---|---|
| 1 | Teamlead: fidelity M1-M7 | `019fe121-ca0c-7513-ab16-35da9bbfbdfb` | `running -> shutdown` | нет |
| 2 | Структурщик: DAG и slicing | `019fe121-9e36-7341-bac4-b4b40381c652` | `running -> shutdown` | нет |
| 3 | Узкий Teamlead без inherited context | `019fe143-db16-7102-9068-9d8c0f71853e` | `running -> shutdown` | нет |
| 4 | Минимальная fidelity-проверка | `019fe146-5206-7053-a225-e88dfe71bcd8` | `running -> shutdown` | нет |
| 5 | Минимальная delivery-проверка | `019fe146-6929-7522-a895-db0001fcb9a5` | `running -> shutdown` | нет |

## Что не было сделано

- Молчание агента не записано как `LGTM` или `BLOCK`.
- Шестой независимый вызов не запускался.
- Предметный checkbox EPIC не закрыт локальной самооценкой.
- Пять попыток не смешаны с пятью внешними прогонами комнаты M7: это отдельный review gate.

## Локальный выход

Председатель собрал [`EPIC_REVIEW_LOCAL.md`](../meeting/static-mmbrn-container/EPIC_REVIEW_LOCAL.md)
из первичных carrier M1-M7. Его вердикт `LOCAL PASS` позволяет показать сборку владельцу,
но не выдаётся за независимое ревью. Решение о ратификации при раскрытом ограничении
остаётся у владельца.

Владелец выбрал ратификацию с раскрытым ограничением 2026-08-08 сообщением
«ратифицирую». Это не превращает пять пустых вызовов в LGTM и не разрешает повторять их
задним числом как успешные.
