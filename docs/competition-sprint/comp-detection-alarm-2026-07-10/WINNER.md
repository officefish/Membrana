# Competition Sprint Winner — comp-detection-alarm-2026-07-10

| Place | Team | Weighted score |
|-------|------|----------------|
| 1 | **beta** | **213.5** |
| 2 | gamma | 191.0 |
| 3 | alpha | 179.5 |

**Winner:** Team **Beta** — «Измеренный сценарий» (деривация bundled MVP, выведенные из
бенчмарков пороги, 24 теста с гранями, находка presence-гейта).

**Merge strategy:** PR `comp/comp-detection-alarm-2026-07-10/beta` → `main`
(отступление от шаблона: techies68 мертва; base main зафиксирован в brief).

**Cherry-pick from losers (идеи, не diff — consilium §Pre-vote):**
- print-слот наблюдаемости Gamma (тренд перезаписью одного слота);
- нумерованные comment-группы Alpha ①–⑥ при 5b-полировке;
- detached-паттерн Gamma — резерв, если host не получит `report-build` (Pre-vote п.2).

**Обязательные follow-up на main (независимо от победителя):**
1. Wiring-фикс exec-subgraph (fusion/ensemble/proximity stores) — блокер Задачи A.
2. Host: поддержка `report-build` async jobs (или канонизация detached-паттерна).
3. commit-msg хук: тип `comp(...)`.

**Phase 5b:** все три форка → пикер (`tier: community`) взамен прошлых async-v2;
manifest `CATALOG_PUBLISH.json` + `yarn comp:publish-catalog`.

**Ветки проигравших:** не мержатся; теги `comp-…-{alpha,gamma}-final` +
consilium-freeze сохраняют код.

**LGTM:** Vesnin, 2026-07-10. **LGTM Product:** ⏳ (владелец — перед merge).
