---
name: membrana-storm
description: >-
  Runs Membrana Шторм (storm) — the divergent format: a conversation from which theses are
  born (often a live conspectus of a future report / insight / meeting-input), led by
  secretary Ангелина with 5 participant personas, a free robot-pet voice, and the owner.
  Use when user says шторм, storm, «пошумим», «породить тезисы», «конспект будущего
  доклада», дивергентный формат, or the matter is still diverging and unformulated. Do NOT
  use for a convergent verdict (заседание / membrana-meeting), a ready one-question fork
  (yarn consilium), or an executable task (membrana-task-lifecycle).
---

# Mirror — шторм

**Canonical:** [`.cursor/skills/membrana-storm/SKILL.md`](../../../.cursor/skills/membrana-storm/SKILL.md)

Run that playbook verbatim. Регламент: `docs/STORM_REGULATION.md`; процедура ведущей:
`docs/virtual-team/angelina/STORM_PROCEDURE.md`. Ключевые инварианты: дивергентный формат
(беседа → тезисы, ≠ заседание); три голоса (Ангелина — единственный гейт каскада, 5
участников, робот-питомец `origin: pet` вне оснований гейта); дом `docs/storm/<id>/`,
открыт по названному предмету; закрытие — «пора» владельца (пол) ∨ семь вдохов (неотменяемый
потолок); развилка на выходе обязательна (вкл. «никуда»), директива — факультативна и
требует двух подписей; тайминг детерминирован (без сети/`Date.now`/`Math.random`).
