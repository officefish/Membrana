# Mirror — заседание

**Canonical:** [`.cursor/skills/membrana-zasedanie/SKILL.md`](../../../.cursor/skills/membrana-zasedanie/SKILL.md)
· регламент: [`docs/ZASEDANIE_REGULATION.md`](../../../docs/ZASEDANIE_REGULATION.md)

Run that playbook verbatim. Key invariants:

- Заседание ≠ серия консилиумов: общее задание + свой протокол + свой аудитор.
- Один вопрос — одно заседание (S-Z1, машинный отказ до прогона).
- Вердикта нет → заседание не состоялось (S-Z2); «частично» не существует.
- **Аудитор ≠ председатель** (S-Z5) — иначе аудита не было.
- З0: все вопросы в одной комнате, единственный вердикт — порядок; ратифицирует владелец.

```bash
yarn consilium --zasedanie <id> --topic-file <повестка.md> --save-as <id>-z<n>-<slug> "…"
```

Регламент — **черновик**, подлежит ратификации консилиумом.
