---
name: membrana-local-sprint
description: >-
  Runs Membrana local sprint, the single canonical local sprint procedure for agent tasks:
  register epic/phases as sprintKind=membrana-local-sprint, cut work into accountable blocks,
  ratify the cut, gate real context execution, write procedure-run-journal evidence/gaps, and
  record prediction ↔ outcome. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, спринт с честными исполнителями, нарезка задачи, план нарезки,
  ратифицируй нарезку, гейт исполнения, yarn sprint:cut / sprint:gate / sprint:experience.
---

# Mirror — Membrana Local Sprint

**Canonical:** [`.cursor/skills/membrana-local-sprint/SKILL.md`](../../../.cursor/skills/membrana-local-sprint/SKILL.md)

Run that playbook verbatim. Канон: `docs/procedures/membrana-local-sprint` · вердикт
заседания `sprint-honest-performers` (10/10, ратифицирован 30.07) ·
`docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md` · `OWNER_ANSWERS.md`.

Живое имя — `membrana-local-sprint`. Старое `honest-sprint` понимать только как
alias-триггер и сразу нормализовать. Новые локальные задачи регистрировать с
`sprintKind: "membrana-local-sprint"` и инстансом в `docs/local-sprint/<id>/`;
другие локальные sprint-kind не заводить.

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
