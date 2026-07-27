# Case: case-2026-07-27-conveyor-format

## Raw

Конвейер заседания bridge-command-post, 27.07, одна сессия: шесть предметных комнат
подряд на пороге ≥30 реплик — 38 (M1) · 55 (M2) · 34 (M3) · 48 (M4, единогласно) ·
42 (M5) · 34 (M6), суммарно 251 реплика, ни одного структурного отказа
{artifacts: docs/seanses/bridge-command-post-m1..m6-*-2026-07-27.md, метаданные
каждого протокола: Модель xai/grok-4.5, rt-6 «все ID-метки повестки присутствуют»}.

Все шесть вердиктов — таблицы решений с DoD, закрытыми словарями и явной строкой
границ («существо других комнат не трогать»); проверка «чужих комнат в DoD нет»
прошла на каждом. Контраст того же дня: та же процедура на deepseek-звене дала
18/30 (честно размечено, не добито), а прогон с полной персонной памятью (7.5K
токенов) уехал с темы — формат удержался только на связке «структурная повестка
с ID-метками + порог + сильное звено».

## Conclusion

Формат комнаты — не свойство модели, а свойство сборки: **структурная повестка
(один ID-вопрос, посылки, границы) + машинный порог реплик + rt-проверки дают
воспроизводимый полный формат на сильном звене — и честную деградацию, а не
имитацию, на слабом**. Жест: вкладываться в повестку и гейты, не в уговоры модели.

## Meta

- id: case-2026-07-27-conveyor-format
- schemaVersion: case-meta/1
- sessionDate: 2026-07-27
- sourceBridge: session:139af2d5-8ada-4d94-b43f-00b2df079a2e (заседание bridge-command-post, M1–M6)
- status: candidate
- rawRefs: [docs/seanses/bridge-command-post-m1-cast-2026-07-27.md, docs/seanses/bridge-command-post-m2-frames-2026-07-27.md, docs/seanses/bridge-command-post-m3-truth-contract-2026-07-27.md, docs/seanses/bridge-command-post-m4-improvisation-cases-2026-07-27.md, docs/seanses/bridge-command-post-m5-console-2026-07-27.md, docs/seanses/bridge-command-post-m6-debts-observations-2026-07-27.md]
- conclusionDigest: Полный формат = структурная повестка + порог + rt-проверки; на слабом звене — честная деградация вместо имитации.
- tags: [other]
- logicalSlot: consilium.format-by-assembly
- derivedInstructionId: null
- stampedBy: null
- stampedAt: null
- capturedBy: агент сессии мостика (председатель), 27.07

Сводная строка: сессия `139af2d5`, конвейер M1–M6 заседания (27.07).
