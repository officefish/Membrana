# Промпт: pr:wait approval + interrupt-resume

> Размер: **S** · `id` = `pr-wait-approval-resume` · [#724](https://github.com/officefish/Membrana/issues/724).

## Контекст

`yarn pr:wait` (#643) не различал approval и не умел resume после interrupt.

## Промпт целиком

Состояние `approval` (CI не red + REVIEW_REQUIRED/CHANGES_REQUESTED), exit 5.
Checkpoint в `.git/pr-wait-*.json`, `--resume`, SIGINT сохраняет checkpoint.
Обновить граблю AGENTS.

### Definition of Done

- [x] classifyPrWait + тесты approval/resume
- [x] exit-коды: 0 green · 1 red · 2 none · 3 timeout · 4 error · 5 approval
- [x] AGENTS грабля обновлена
