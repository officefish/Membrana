# Промпт: Честность ревью — гейт различает три исхода вердикта, oversized читает снятие по commit-status

> **Task-промпт** карточки `review-honesty`. Размер: **S**. Артефакт: **PR на блок**.
> Реестр: `id` = `review-honesty` в [`docs/tasks/registry.json`](../tasks/registry.json).
>
> **Статус: спринт поставлен и исполняется в день постановки (05.08).** Этот файл —
> указатель, не вторая копия постановки.

## Носители

| Что | Где |
|-----|-----|
| Нарезка, решения и ратификация (21:05Z) | [`docs/sprint/cut/review-honesty.json`](../sprint/cut/review-honesty.json) |
| Прогон спринта | [`docs/local-sprint/review-honesty/OPEN.md`](../local-sprint/review-honesty/OPEN.md) |
| Ретроспектива-источник | прецедент [`2026-08-05-oneshot-snapshots-declaration-and-cut-norm.md`](../precedents/drafts/2026-08-05-oneshot-snapshots-declaration-and-cut-norm.md) |

## Два блока

- **e1-verdict-diagnosis** (vesnin): `review:gate` различает «артефакта нет» и «артефакт
  есть, маркер вердикта не записан». Вещдок — PR #1713. Закрытый список исходов
  `pass|block|unknown` **не расширяется** (решение владельца): различается причина.
- **e2-oversized-status-source** (dynin): `review:oversized` считает PR снятым по
  артефакту **или** по commit-status `review/teamlead=success` (только success — слово
  владельца: `failure` гейт ставит и при BLOCK, и при протухании, снаружи неразличимо).
  Плюс первые зубы прибора — сегодня их нет ни одного.

## Вне спринта

Ремонт overlay-цепочки ревью (#1306/#1347/#1549) — чужой дом. Политика gitignore
ревью-артефактов не меняется (#433). Переанкеровка вердикта при диффе только из
производных — кандидат в ADR.
