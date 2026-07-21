# OPEN: kits-dream-master — второй кит (Мастер снов)

| Поле | Значение |
|------|----------|
| **Sprint** | `kits-dream-master-2026-07-21` |
| **Registry epic** | `kits-dream-master` · [#855](https://github.com/officefish/Membrana/issues/855) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | `feature/kdm-d1-roots` (фаза D1) |

**Prompt эпика:** [`KITS_DREAM_MASTER_PROMPT.md`](../../prompts/KITS_DREAM_MASTER_PROMPT.md)  
**Семя:** [#761](https://github.com/officefish/Membrana/issues/761) · прецедент: `kits-angelina-morning` (#814)

---

## Инварианты

1. Кит = сны v2; не Night Build; CLI `night:research` вне продукта кита.
2. Owner пина = **dynin**; текст снов = «Мастер снов» / `DREAM_MASTER_VERSION`.
3. Root = только `scripts/dreams.mjs`; lib — замыканием.
4. `DREAM_MASTER_PROMPT.md` → precedents процедуры (D3), не pins.

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **D0** | `kdm-d0-brief` | [#856](https://github.com/officefish/Membrana/issues/856) | vesnin | ✅ done · [PR #863](https://github.com/officefish/Membrana/pull/863) |
| **D1** | `kdm-d1-roots` | [#857](https://github.com/officefish/Membrana/issues/857) | ozhegov | ✅ LGTM — ship |
| **D2** | `kdm-d2-kit` | [#858](https://github.com/officefish/Membrana/issues/858) | dynin | ⬜ |
| **D3** | `kdm-d3-procedure` | [#859](https://github.com/officefish/Membrana/issues/859) | ozhegov | ⬜ |
| **D4** | `kdm-d4-closure` | [#860](https://github.com/officefish/Membrana/issues/860) | vesnin | ⬜ |

---

## Gate checklist (D1)

- [x] Root: `scripts/dreams.mjs` (`dreams:tick` / `digest`)
- [x] Out-of-kit таблица (Night Build, night:research CLI, Nest, DREAM_MASTER_PROMPT)
- [x] Промпт автора → precedents D3, не pins; транзитив `lib/night-research.mjs` назван честно
- [x] LGTM ozhegov (owner ship 2026-07-21)

### Roots / out-of-kit (сводка)

| In kit (root) | Out of kit |
|---------------|------------|
| `scripts/dreams.mjs` | Night Build · `yarn night:research*` · office Nest dreams · `DREAM_MASTER_PROMPT.md` (precedents) · truth registry (data) |

Полные таблицы — в эпик-промпте § «Состав кита».

---

## Первые команды

```bash
# замыкание (ожидание ~11 узлов, в т.ч. lib/night-research.mjs):
node --input-type=module -e "import {collectSubgraph} from './scripts/lib/kit-subgraph-audit.mjs'; console.log([...collectSubgraph(process.cwd(),['scripts/dreams.mjs']).paths].sort().join('\n'))"
```
