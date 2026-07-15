# PC-2b: пересборка usercase-free-spectrum-live на is-window-elapsed

| Поле | Значение |
|------|----------|
| id | `pc2b-spectrum-window-rebuild` |
| GitHub Issue | #493 (спринт palette-clarity-nodes) |
| size | M |
| Родитель | pc2-periodic-window-gate (консилиум), PC-2a узел (#505, merged) |
| Режим | **продуктовый спринт, максимальное качество** (слово владельца): консилиум + research + делегирование подзадач участникам команды + адверсариальная верификация |

## Цель

Спектральный FREE-сценарий (`usercase-free-spectrum-live`) перестаёт тащить
рекордер как часы: `get-recorder` + `is-recording-window-full` (владелец времени —
recorder) → `is-window-elapsed` (чистый periodic-гейт по host-часам, PC-2a).

## Разведка (scout, ground truth @2026-07-15)

Текущая обвязка часов окна в `usercase-free-spectrum-live` (деривация MVP):
- `collectFrames → windowFull` (exec; спектр перепаял, т.к. CollectSamples вычтен).
- `recorderClock (get-recorder-168) → windowFull` (data RecorderRef).
- `windowFull.exec-true-out → sequence-gate-v20-async` (KEPT MVP-ребро).
- `windowFull.exec-false-out → main-infinity` (KEPT MVP-ребро).

**Свап (well-defined):**
1. Снять узлы `windowFull` (is-recording-window-full) + `recorderClock` (get-recorder-168) — в removed-set деривации.
2. Их KEPT-рёбра авто-отпадают (removed.has). Заново добавить от нового узла:
   - `is-window-elapsed.exec-true-out → sequence` (окно набралось → цикл наблюдения).
   - `is-window-elapsed.exec-false-out → infinity` (ещё нет → следующий тик).
   - `collectFrames → is-window-elapsed` (exec).
   - recorder-ребро НЕ восстанавливать (рекордера нет).
3. Новый узел `is-window-elapsed` с `windowElapsedMs` (величина — из консилиума, см. research).
4. Обновить: MVP_MAIN_ANCHORS (убрать recorderClock/windowFull, добавить id нового узла),
   removed-константы, comment-группу (ссылалась на windowFull), тексты.
5. Тесты `usercase-free-spectrum-live.test.ts`: нет узлов get-recorder/is-recording-window-full
   как часов; есть is-window-elapsed; true→sequence, false→infinity; парс/валидация ok;
   нет висячих рёбер/сирот; мутации дают красное.

## Фазы (можно расширять)

1. **Research** (Dynin, WebSearch) — величина окна наблюдения, overlap vs hop, окно↔замеры, каденс. → грунтует windowMs.
2. **Consilium** (secretary) — подтвердить свап + величину windowMs + семантику самосбрасывающегося окна, грунтованные scout+research.
3. **Implementation** (делегат — Kuryokhin, аудио/время) — пересборка графа + тесты, изолированно.
4. **Adversarial verify** (делегат — верификатор) — граф-валидность, нет рекордера, семантика сохранена, чек по журналу L-недочётов.
5. **Teamlead review + merge.**

## Инварианты
- Живой Run = проверка СБОРКИ, не детекции (борд держит снапшот — пересоздать из пикера). Живой дрон не гейт.
- Backward-compat: старый is-recording-window-full НЕ трогаем (другие графы его используют).
- Границы: только `usercase-free-spectrum-live` + его тест. combined/нейро/sample-графы не трогать.
- Out of scope: долг `collectorConfig.windowSec` в collect-fft-frames (F2, отдельная карточка); alarm-loop.
- Перед сборкой — журнал L1–L36 (USERCASE_COMPETITION_LESSONS).
