# Промпт: Контейнер network — каркас дома (#1910)

> S · id `network-house-skeleton` · Issue [#1910](https://github.com/officefish/Membrana/issues/1910) · lead **ozhegov**.
> Поставка 1 исполнения формы, ратифицированной заседанием
> [`network-container`](../meeting/network-container/MEETING_VERDICT.md) (обе ратификации
> владельца 13.08). Исполнена тем же днём (PR этой поставки). Файл — указатель.

## Что построено (канон — MEETING_VERDICT, вердикты В1/В2/В3/В5/В6/В7)

- `docs/audit/network/README.md` — карта дома: единица зонд-снимок, словарь 5 состояний
  плюс ось outcome, слои (лента / overwrite-проекции / **рукописные нормы** / cache),
  retention 90д, запрещённые классы полей, такт и канал находки, границы #1425.
- `docs/audit/network/schema.json` — закрытая схема снимка (`additionalProperties:
  false` — слой 1 защиты шва В3).
- `registry/egress-rules.json` — нормы трафика данными; K1 мигрирован словом
  (office→Linear via media-VPS, precedent_ref), поведение кода не менялось.
- `registry/machine-policy.json` — политика машин (гармонизированный носитель, аудит
  M6–M7); permanent-исключение media/linear-snapshot.
- `registry/network-policy-violations-budget.json` — warn-храповик, бюджет 4.
- `.gitignore`: `docs/audit/network/cache/`.

## Проверка

```bash
yarn tooling:atlas --check          # дом 54-й, производные свежи
cat docs/audit/network/README.md    # канон совпадает с MEETING_VERDICT
```

Зубы и ночной такт — поставки #1912, #1913. Мастерская (3 глагола) — отдельной
поставкой; до неё дом — «дом без мастерской» (законно по атласу).
