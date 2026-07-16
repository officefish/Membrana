---
name: membrana-always-yes
description: "Scoped auto-yes профиль разрешений (ADR-0009 Р7): авто-подтверждение рабочей поверхности при жёстком deny на опасное (прод-деплой, force-push, ssh, core). По умолчанию в ночном спринте, явно в дневном. НЕ глобальный bypass."
---

# Mirror — always-yes

**Canonical:** [`.cursor/skills/membrana-always-yes/SKILL.md`](../../../.cursor/skills/membrana-always-yes/SKILL.md)

```bash
yarn always-yes:on | off | status
```

`deny` > `allow` во всех режимах; ночной делегат наследует профиль координатора.
Реализация: `scripts/always-yes.mjs`. Не коммить `.claude/settings.local.json`.
