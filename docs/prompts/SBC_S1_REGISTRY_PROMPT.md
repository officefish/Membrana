# Промпт: S1 — derived-реестр scripts/registry

> Размер **M**. Реестр: `sbc-s1-registry` · Issue #793 · Lead: **dynin** · Parent: `scripts-boundary-container`.

## Цель

Канонический overwrite-снимок `scripts/registry/SCRIPTS_LIST.md` (+ Meta: Date, SHA, Source)
из SoT: ФС `scripts/**` + корневой `package.json` `"scripts"`. Опционально dated-копия.

Сырой дамп `yarn tooling:overview` — только в `scripts/cache/` (не SoT).

## Запрещено

Второй дом; рукописный «полный» инвентарь без сверки с ФС; таксономия «из чата» без HARD GATE (см. AGENT_PROMPT Scenario B).

## DoD

- [ ] `SCRIPTS_LIST.md` overwrite с Meta; воспроизводимая команда в README/промпте.
- [ ] README контейнера: пункт 3 чеклиста → ✅.
- [ ] LGTM dynin.
