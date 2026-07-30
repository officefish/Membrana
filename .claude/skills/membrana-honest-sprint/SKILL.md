---
name: membrana-honest-sprint
description: >-
  Runs a Membrana sprint with HONEST PERFORMERS: the teamlead cuts the work into blocks
  (who / through which profile context / which zone / predicted volume), the owner
  ratifies the cut, the gate checks that the context run actually happened, and both the
  teamlead and the lead record «my prediction ↔ its outcome». Use when the user says
  честный спринт, спринт с честными исполнителями, нарезка задачи, план нарезки,
  ратифицируй нарезку, гейт исполнения, yarn sprint:cut / sprint:gate / sprint:experience.
  Do NOT use for Cowork Sprint (3 isolated blocks of one development — membrana-cowork),
  Competition Sprint (one task, three answers, a winner) or an ordinary day M/L task
  (membrana-task-lifecycle).
---

# Mirror — спринт с честными исполнителями

**Canonical:** [`.cursor/skills/membrana-honest-sprint/SKILL.md`](../../../.cursor/skills/membrana-honest-sprint/SKILL.md)

Run that playbook verbatim. Канон: вердикт заседания `sprint-honest-performers` (10/10,
ратифицирован 30.07) · `docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md` ·
`OWNER_ANSWERS.md`.

Ключевые инварианты:

- **Роли не совмещаются:** нарезку аудирует владелец ратификацией, исполнение — Ангелина
  (все этапы + реальная ответственность), Фаррелл — свободный голос без гейтящей силы.
  Ведущая проверяет **наличие и метки**, не достаточность вещдока: гейт, а не судья.
- **Мерка компактности не изобретается** — `OVERSIZED_CHANGED_LINES` импортом; порог
  применяется к **проходу** ревью, а не к блоку (класс исключений закрыт четырьмя условиями).
- **Списки закрыты:** шесть findings нарезки (+ седьмая «резчик ≠ исполнитель» как находка),
  четыре рода следа, семь вердиктов гейта, четыре причины второй двери. Род или причина вне
  списка — ошибка входа, а не «прочее».
- **Пустой корпус → «КОРПУСА НЕТ»**, никогда «нарушений 0». Нет `window`/`revisionAt` → ошибка
  входа, а не «всё свежее».
- **Перерезка = новая версия плана и новая ратификация**; правка тела сбрасывает ратификацию
  дайджестом. Переполнение в работе — управленческое решение с рекомендациями, не тихая резка.
- **Два носителя следа из четырёх и два входа петли опыта не построены** — метрики честно отдают
  `defined:false` с причиной, процент не печатается. Выдавать это за полноту запрещено.
