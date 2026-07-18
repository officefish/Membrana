# PC-2c: полная развязка спектр-наблюдения от записи (StartRecording/StopRecording устарели)

| Поле | Значение |
|------|----------|
| id | `pc2c-spectrum-recording-decouple` |
| GitHub Issue | #493 (спринт palette-clarity-nodes) |
| size | M |
| Источник | Находка адверсариальной верификации PC-2b + **уточнение владельца 2026-07-15** |
| Родитель | palette-clarity-nodes #493; после PC-2b (#507, merged) |

## Решение владельца (семантика)

Аудиопоток (`StartStreaming`/`GetAudioStream`) = **трансляция звука с микрофона**.
`StartRecording`/`StopRecording` = **создание ТРЕКА** на основе потока. Есть
сценарии, где поток слушается и обрабатывается детекторами, а трек никто не создаёт.
**Раз производство трека (`MakeTrack`) в спектр-графе уже убрано — `StartRecording`/
`StopRecording` здесь УСТАРЕЛИ** (крутят сессию записи, slice не подключён, трек не
выходит; код это признаёт, spectrum-live.ts стр.324).

## Цель

Спектральное наблюдение честно держит ТОЛЬКО аудиопоток + FFT, без записи.

## Разведка (scout, ground truth @2026-07-15)

- Поток НЕЗАВИСИМ от записи: `StartStreaming(node-...-49) → GetAudioStream(fn-3)`.
  FFT-путь: `GetAudioStream → GetSpectralAnalyser → collect-fft-frames → flush → тренды`.
  Рекордер этому пути НЕ нужен.
- Запись переплетена в ТРЁХ местах (surgery многоветочная):
  1. **Bootstrap/onConnect:** `StartStreaming → fn-1(StartRecording)` — снять вызов fn-1, поток остаётся.
  2. **Main Sequence:** `then-0 = StopRecording` — снять, переиндексировать (then-1 flush→then-0, then-2 restart→then-1).
  3. **Рестарт-цепочка:** `restartStreamFn(fn-3-block-2) → restartRecordingFn(fn-1-block)` — снять restartRecordingFn, оставить restartStreamFn.
- Функции fn-1 (StartRecording) и связанные — если после снятия вызовов fn-1 нигде не зовётся, функцию можно удалить; ИНАЧЕ оставить определение, но не вызывать (проверить!).

## Инварианты / риски

- **L35 (рестарт на latent-ветке):** переиндексация Sequence и рестарт-цепочки — зона L35, аккуратно.
- **Поток и журнал НЕ ломать:** StartStreaming, GetAudioStream, onConnect-журнал, teardown — остаются. Убираем ТОЛЬКО recording.
- **Backward-compat:** start-recording/stop-recording узлы (палитра/рантайм) НЕ трогать — другие графы их используют. Убираем их только ИЗ ЭТОГО графа.
- Границы: только `usercase-free-spectrum-live.ts` + тест. is-window-elapsed (PC-2b) не регрессировать.
- Живой Run = сборка, дрон не гейт.

## Фазы (продуктовый режим, макс. качество)

1. Scout углубить — где именно fn-1 зовётся во всех ветвях; удаляема ли функция.
2. Реализация (делегат — Kuryokhin).
3. Адверсариальная верификация (независимый скептик): поток+FFT+журнал целы, записи нет, is-window-elapsed цел, гард PC-2b жив.
4. Teamlead review + merge.

## DoD
- В собранном документе НЕТ узлов start-recording/stop-recording; StartStreaming/GetAudioStream/FFT/журнал целы.
- Sequence переиндексирован корректно, рестарт наблюдения замыкается (L35 цел).
- Гард-тест PC-2b (windowMs↔measurementsCount) не сломан; is-window-elapsed на месте.
- parse+validate 0 ошибок; scoped CI зелёный; мутация-проба не вхолостую.
