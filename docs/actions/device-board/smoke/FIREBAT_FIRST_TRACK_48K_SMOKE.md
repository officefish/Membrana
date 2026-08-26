# Smoke: Firebat first track 48 kHz or fail-closed

Цель: закрыть живым протоколом класс #2046 — ровно первый захват после старта сценария не
имеет права записаться в 44,1 kHz. Допустимы только два исхода:

- первый трек записан и измерен как `48000 Hz`;
- capture отказал до записи с `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE`.

Недопустимый исход: первый трек принят как `44100 Hz`, даже если все следующие треки уже
`48000 Hz`.

## Где выполнять

Только на Firebat, руками владельца, вне деплоя. Во время живого сеанса ничего не выкатывать.
Перед smoke проверить `yarn node:duty-ready`.

## Сценарий

1. Полностью остановить текущий сценарий записи.
2. Открыть Studio/Device board на Firebat так, как будет идти дежурство.
3. Запустить сценарий заново.
4. Дождаться первого трека или fail-closed отказа.
5. Если первый трек записан, открыть его метаданные/измерение на сервере и зафиксировать
   фактическую частоту, длительность и id записи.
6. Дождаться ещё 2-3 треков только как контроль хвоста; они не лечат первый трек.

## Форма протокола

| Поле | Значение |
|---|---|
| Дата/время старта сценария |  |
| Узел | Firebat T6 |
| Проверка `node:duty-ready` перед smoke | PASS / FAIL |
| Исход первого захвата | `recorded` / `fail-closed` |
| Если `recorded`: track id |  |
| Если `recorded`: sampleRate measured |  |
| Если `recorded`: duration |  |
| Если `fail-closed`: error code |  |
| Следующие 2-3 трека | sampleRate list |
| Вердикт | PASS / FAIL |

PASS:

- `recorded` и `sampleRate measured = 48000`;
- либо `fail-closed` и error code `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE`.

FAIL:

- первый recorded track имеет `sampleRate measured = 44100`;
- нет измеренной частоты у записанного первого трека;
- первый отказ не содержит рода `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE`.

## Адрес fail-closed в коде

- `packages/services/audio-engine/src/core/audio-context.ts` — `createAudioContext(... requireSampleRate)` закрывает контекст и бросает `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE`, если браузер не дал требуемую частоту.
- `packages/services/audio-engine/src/core/live-sampler.ts` — `LiveSampler.ensureRequestedSampleRate()` повторно проверяет фактический `AudioContext.sampleRate` перед loop.

