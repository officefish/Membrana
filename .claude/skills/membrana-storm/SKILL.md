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
· регламент: [`docs/STORM_REGULATION.md`](../../../docs/STORM_REGULATION.md)
· процедура: [`docs/virtual-team/angelina/STORM_PROCEDURE.md`](../../../docs/virtual-team/angelina/STORM_PROCEDURE.md)

Run that playbook verbatim. Key invariants:

- **Дивергентный** формат: беседа → тезисы. Шторм ≠ заседание (то сходится к вердикту).
- Три голоса: секретарь **Ангелина** (единственный гейт каскада) · 5 участников-персон ·
  **робот-питомец** (`origin: pet`, судит и критикует, но в основания гейта не входит).
- Дом — директория `docs/storm/<id>/`; открыт ⟺ владелец **назвал предмет** (S-S1).
- Закрытие: **пора** владельца — суверенный пол; **семь вдохов** — неотменяемый потолок,
  закрывает даже против владельца (S-S5).
- **Развилка на выходе обязательна**, включая явное «никуда» (S-S2); директива — факультативна
  и требует **двух подписей** (участник + владелец, S-S3).
- Опровержение оставляет след согласия (S-S4). Тайминг детерминирован: без сети/`Date.now`/`Math.random`.

Регламент — **черновик v0.1**, канон-статус после чистого аудита заседания-родителя.
