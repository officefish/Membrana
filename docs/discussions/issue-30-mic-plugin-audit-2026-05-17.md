# Аудит #30: импорты mic-плагинов (2026-05-17)

> Закрытие недели · стендап 2026-05-16 · follow-up code-review #30

## Команда

```bash
rg -n "@membrana/telemetry|navigator.mediaDevices|AudioContext" apps/client/src/plugins/microphone* apps/client/src/modules/microphone apps/client/src/plugins/*-viz
```

## Результат

| Область | Находка | Оценка |
|---------|---------|--------|
| `microphone-stream-viz/micStreamTelemetry.ts` | прямой `@membrana/telemetry-service` | **нарушение** (#30) |
| `MicrophoneModule.tsx` | `navigator.mediaDevices` — владелец потока | OK |
| `harmonic-detector-viz` | без telemetry / без своего AudioContext | OK |
| `fft-*`, `sound-quality-viz` | telemetry не найден в grep | OK |

## Рекомендация (follow-up Issue)

Вынести запись журнала из `micStreamTelemetry.ts` в agenda/journal API (как `telemetry-journal` модуль), без прямого импорта `@membrana/telemetry-service` из плагина визуализации.

**Не блокирует** закрытие недели по harmonic / benchmark.
