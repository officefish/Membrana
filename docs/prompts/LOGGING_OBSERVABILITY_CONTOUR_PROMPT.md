# Промпт: Магистраль наблюдаемости — исполнение нарезки `logging-observability-cut`

> **Эпик-зонтик**, не рабочий промпт одного агента. Размер: **L**.
> Реестр: `id` = `logging-observability-contour` · **GitHub Issue:** [#2117](https://github.com/officefish/Membrana/issues/2117)

---

## Что это

Исполнение задания, ратифицированного владельцем 24.08.2026 по итогам шторма
`storm-logging-observability-2026-08-24` и заседания `logging-observability-cut`.
Канон задания: [`EPIC.md`](../meeting/logging-observability-cut/EPIC.md) —
очередь, границы, DoD кусков; протоколы комнат — в `docs/seanses/logging-observability-cut-*`.

## Очередь исполнения (ратифицирована)

```text
A (обязательно первым) → { B ∥ C } → D;  E — после контракта B
```

| Кусок | Карточка | Issue | Промпт |
| --- | --- | --- | --- |
| A — сторож диска (Д1) | `obs-disk-guard` | #2118 | [`OBS_DISK_GUARD_PROMPT.md`](./OBS_DISK_GUARD_PROMPT.md) |
| B — контракт отказа + номер | `obs-failure-face` | #2119 | [`OBS_FAILURE_FACE_PROMPT.md`](./OBS_FAILURE_FACE_PROMPT.md) |
| C — пульс дежурства | `obs-duty-pulse` | #2120 | [`OBS_DUTY_PULSE_PROMPT.md`](./OBS_DUTY_PULSE_PROMPT.md) |
| D — `/health/deep` | `obs-health-deep` | #2121 | [`OBS_HEALTH_DEEP_PROMPT.md`](./OBS_HEALTH_DEEP_PROMPT.md) |
| E — контейнер Сентри | `obs-sentry-container` | #2122 | [`OBS_SENTRY_CONTAINER_PROMPT.md`](./OBS_SENTRY_CONTAINER_PROMPT.md) |

## Границы магистрали

Прод не трогать без слова владельца · #2113/#2110 — соседние линии (встают на контракт B,
их существо не наше) · общий дом логов (Loki) отложен · санитарный список Anthropic — не тут.

## Закрытие

Каждый кусок: PR → отчёт в Issue → `yarn task:archive <id>`. Эпик закрывается последним,
когда все пять кусков в архиве.
