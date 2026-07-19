# C1R2 — логическая коррекция C1 после второго BLOCK

> Общее задание: `MEETING_BRIEF.md`.
> Исходный вопрос: `C1_TOPIC.md`.
> История двух BLOCK: `C1_AUDIT.md`.
> Это третий раунд того же узла C1, а не новый узел DAG.

## Вопрос

**C1 — как окончательно определить immutable closable-сущности и типизированные границы их закрытия, не смешивая их с фактами accepted/transcribed/delivered/outcome-proven и не выводя один тип покрытия из другого?**

## Неподвижные ограничения двух аудитов

- Итог содержит отдельный заголовок `ВЕРДИКТ C1`.
- Сначала назвать сущности/claims с immutable identity и границами; затем отдельно назвать
  факты об этих сущностях. Факт не выдавать за closable object.
- Identity INSIGHT нельзя терять.
- Зафиксировать только non-implications: `accepted ⇏ transcribed`,
  `transcribed ⇏ delivered`, `delivered ⇏ outcome-proven`. Не утверждать prerequisites и
  переходы: это C2.
- Не выбирать hash, обязательные поля, git-команду, storage или evidence schema: это C3+.
- Различать как минимум `delivery-covered(slice)` и `outcome-proven(slice)`; не объявлять
  ни один универсальным `covered` и не выводить один из другого.
- Новая фаза не мутирует claims уже принятого мандата: это новый immutable mandate/revision
  с новым ID. Старый мандат и его оценки не пересчитываются задним числом.
- Нельзя классифицировать Hermes, Comms, Telegram или Persona: это C5.
- Перечислить именно использованные исходные посылки C1; внешние аналогии не считать
  логическим основанием.
- State machine, evidence contract, history/storage и CLI остаются C2–C7.

## Требуемый единственный вердикт

- closable-сущности/claims, их immutable identity и границы;
- четыре разных факта и их носители без технической схемы;
- два разных типа покрытия и допустимые non-implications;
- partial delivery, partial outcome и новая фаза без мутации прошлого;
- исчерпывающий список реально использованных посылок;
- явный перечень оставленных открытыми C2–C7.
