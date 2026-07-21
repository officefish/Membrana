# Промпт: Эпик — docs/audit/git → движок Mintlify

> **L** · `branch-mintlify-engine` · [#823](https://github.com/officefish/Membrana/issues/823) · lead **vesnin**
> Цепь: F0→F5 (#824–#829).
> Паттерны: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) ·
> [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md).

---

## Контекст

**Server-first для контейнеров:** у каждого контейнера свой движок.
Контейнер веток [`docs/audit/git/`](../audit/git/README.md) получает движок
**Mintlify**: агентам нужны инструкции с хорошими примерами — какую ветку под
какой случай. Эти инструкции — **основа версионирования** по второму паттерну
(подграф MDX/`docs.json` → `path → SHA`), а не hygiene-реестр и не киты скриптов.

Опоры: assortment coverage (#810), грамматика Р4 (`pl-r4-grammar` / #813),
ретроспектива таксономии, `apps/docs` (источник правды спринта; внешний
`mintlify-community/docs-membrana-*` — вне scope, отдельное решение владельца).

**Не путать с** `kits-angelina-morning` (#814) — киты/`kits/` пинят скрипты.

## Фазы

| Фаза | id | Issue | lead |
|------|-----|------:|------|
| F0 | `bme-f0-brief` | #824 | vesnin |
| F1 | `bme-f1-cases` | #825 | ozhegov |
| F2 | `bme-f2-pages` | #826 | rodchenko |
| F3 | `bme-f3-wire` | #827 | ozhegov |
| F4 | `bme-f4-pins` | #828 | dynin |
| F5 | `bme-f5-closure` | #829 | vesnin |

## Архитектура

| Слой | Путь | Роль |
|------|------|------|
| Контейнер | `docs/audit/git/` | registry · analysis · Scenario A/B/Assortment |
| Движок | `apps/docs/**` (Mintlify) | cookbooks «ветка → случай» с примерами |
| Пин | манифест подграфа инструкций | PINNED_SUBGRAPH · latest/pinned |

## Out of scope

- Реализация `kits/` / angelina-morning kit (#814)
- Синхронизация с внешним Mintlify-community репо
- `repo:clean --execute`, движок грамматики Р4 (чужой спринт)

## Acceptance (эпик)

- [ ] Server-first зафиксирован в README контейнера (engine = Mintlify)
- [ ] Каталог случаев → Mintlify-страницы с примерами
- [ ] Навигация `docs.json` + провода из контейнера
- [ ] Манифест пина + аудит полноты подграфа инструкций
- [ ] Фазы архивированы со свидетельством PR
