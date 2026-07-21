# Промпт: Ф0: эпик-промпт, границы ассортимента vs hygiene/Р4, DoD спринта

> Размер: **M**. Реестр: `ba-f0-brief` · parent: `branch-assortment-sprint`.
> Issue: [#802](https://github.com/officefish/Membrana/issues/802) · leadPersona: **vesnin**

---

## Контекст

Первая фаза спринта ассортимента. Нужно зафиксировать границы: hygiene (7 cat) ≠
ассортимент (покрытие жанров); не колонизировать `procedural-layer-impl` / Р4.
Эпик-промпт уже стартован; Ф0 добивает DoD и согласует SESSION_CONTEXT.

**GitHub Issue:** [#802](https://github.com/officefish/Membrana/issues/802)

---

## Промпт целиком

### Кто ты

Координатор под **Vesnin**. Не пиши прод-код сервисов — только docs/prompts +
`docs/audit/git/SESSION_CONTEXT.md` / README при необходимости.

### Что сделать

1. Убедиться, что [`BRANCH_ASSORTMENT_SPRINT_PROMPT.md`](./BRANCH_ASSORTMENT_SPRINT_PROMPT.md) полон (контекст, DoD, out of scope, таблица фаз).
2. В SESSION_CONTEXT — таблица Issues #801–#807, статус «зарегистрирован», next = Ф1.
3. Явные границы vs hygiene Scenario A/B и vs Р4 grammar.

### Definition of Done

- [ ] Эпик-промпт заполнен (не scaffold)
- [ ] SESSION_CONTEXT ссылается на #801–#807 и цепь фаз
- [ ] Границы «не трогаем» записаны
- [ ] LGTM vesnin (можно в чате владельца)

### Out of scope

- Scenario A / decompose (Ф1)
- Карта покрытия (Ф2)
- Изменения движка `repo:branches*`

---

## Acceptance criteria

- [ ] Эпик-промпт готов к исполнению фаз
- [ ] SESSION_CONTEXT синхронен с реестром
- [ ] PR или коммит на ветке `docs/audit-git-container-followup` со свидетельством
