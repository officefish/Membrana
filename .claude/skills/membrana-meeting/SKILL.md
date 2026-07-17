# Mirror — заседание

**Canonical:** [`.cursor/skills/membrana-meeting/SKILL.md`](../../../.cursor/skills/membrana-meeting/SKILL.md)
· регламент: [`docs/MEETING_REGULATION.md`](../../../docs/MEETING_REGULATION.md)

Run that playbook verbatim. Key invariants:

- Заседание ≠ серия консилиумов: общее задание + свой протокол + свой аудитор.
- Один вопрос — одно заседание (S-M1, машинный отказ до прогона).
- Вердикта нет → заседание не состоялось (S-M2); «частично» не существует.
- **Аудитор ≠ председатель** (S-M5) — иначе аудита не было.
- M0: все вопросы в одной комнате, единственный вердикт — порядок; ратифицирует владелец.

```bash
yarn consilium --meeting <id> --topic-file <повестка.md> --save-as <id>-m<n>-<slug> "…"
```

Регламент — **черновик**, подлежит ратификации консилиумом.
