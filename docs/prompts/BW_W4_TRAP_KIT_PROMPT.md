# Промпт: W4 — кит ловушек (пример «Ведьмак»)

> **M** · `bw-w4-trap-kit` · [#950](https://github.com/officefish/Membrana/issues/950) · lead **dynin** · parent `bestiary-workshop`

## Контекст

T3/T5/T15/T18: ловушка = набор **промптов + pure-скриптов**; пин/кит фиксирует
этот набор, **не** шаблон антипаттерна. «Кит Ведьмака» — **пример наведения** на
спринты/доки/скрипты (T5), не обязательное финальное имя жильца.

Прецедент жильца: `kits/dream-master` · `yarn kits:audit`. Схема —
[`kits/MANIFEST.schema.json`](../../kits/MANIFEST.schema.json). Дом кода — плоский
`scripts/` (+ ссылки на prompts в `docs/prompts/` как precedents/корни по правилам
кита, без копипасты Nest).

W1 мог оставить `kit: null` — W4 заполняет id и пины; W2 дал карточку ловушки.

## Промпт целиком

1. Утвердить **id жильца** (предложение: `witcher` / `bestiary-traps` — одно слово
   владельца в PR; «Ведьмак» остаётся human-label в README).
2. `kits/<id>/README.md` + `MANIFEST.json` (`leadPersona: dynin`):
   - `roots` — точки входа ловушки (CLI/lib pure; минимум 1 осмысленный root);
   - `pins` — статическое замыкание; **запрещено** пинить MD-шаблоны антипаттернов
     как roots (T18) — они остаются в доме audit;
   - prompts ловушки: либо static-importable, либо `precedents[]`/таблица в README
     по тому же правилу, что `DREAM_MASTER_PROMPT` у dream-master.
3. Aim-пример в README: как навести кит на спринт / док / скрипт (T5) — короткий
   cookbook «охотник заказывает ловушку → мастерская выдаёт пин».
4. `yarn kits:audit --id <id>` → 0 blocking.
5. Обновить `workshop.manifest.json` (`kit` = id) и карточку ловушки в реестре W2.
6. Не реализовывать полный парк ловушек на все классы — **одна** поставка-пример
   достаточна для DoD эпика.

## Acceptance criteria

- [ ] Жилец `kits/<id>/` + audit green
- [ ] Пин = prompts+scripts ловушки; шаблоны антипаттернов вне pins
- [ ] README с aim-примером («Ведьмак» / human-label)
- [ ] Манифест мастерской и TRAPS-индекс ссылаются на кит
- [ ] LGTM dynin (owner ok)

## Out of scope

CLOSURE (W5); расширение на все классы BESTIARY; автофикс (#533); Night Build;
новые классы линзы без отдельной карточки.
