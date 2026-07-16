---
name: membrana-always-yes
description: >-
  Scoped auto-yes профиль разрешений Claude Code (ADR-0009 Р7): авто-подтверждение
  рабочей поверхности (git/yarn/turbo/node/Edit/Write) при жёстком deny на опасное
  (прод-деплой, force-push, reset --hard, ssh, close-github, правки @membrana/core).
  По умолчанию в ночном спринте, явно в дневном — «отойти от компьютера». НЕ глобальный
  --dangerously-skip-permissions. Use при подготовке делегированного ночного агента или
  автономной дневной сессии. Delegates to .cursor/skills/membrana-always-yes/SKILL.md.
---

# Mirror — always-yes

**Canonical:** [`.cursor/skills/membrana-always-yes/SKILL.md`](../../.cursor/skills/membrana-always-yes/SKILL.md)

```bash
yarn always-yes:on       # scoped auto-yes → .claude/settings.local.json (перезапуск сессии)
yarn always-yes:off      # снять свои записи (ручные сохраняются)
yarn always-yes:status
```

`deny` > `allow` во всех режимах; ночной делегат наследует профиль координатора.
Прод/force/core заблокированы механически. Реализация: `scripts/always-yes.mjs`.
