# Промпт: W3 — поверхность (Mintlify + провода)

> **M** · `arp-w3-surface` · [#1101](https://github.com/officefish/Membrana/issues/1101) · parent `atlas-report-plane` · lead **ozhegov**

## Промпт целиком

1. `yarn tooling:atlas --render` → свежие `registry/ATLAS.md` + `apps/docs/tooling/containers.mdx`.
2. `yarn tooling:atlas --check` — OK.
3. Провода: места в `AGENTS.md` / скиллах audit·tasks, где «контейнер tasks» двусмыслен —
   одна фраза-различение (предмет vs отчёт). Без простыней.
4. Ручная проверка: Mintlify-страница читается как «отчёты / domain / meta», слот llm-calls
   и tasks на месте под report-plane.

## DoD

- [x] Производные свежи; check зелёный
- [x] Нет регрессии «потерян llm-calls / audit/tasks» (report×4)
- [x] Провода AGENTS + skills: слот отчётов ≠ docs/tasks
