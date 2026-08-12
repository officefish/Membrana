# Night Hunt: design-token-drift

| Поле | Значение |
|------|----------|
| Week | 2026-33 |
| Generated (UTC) | 2026-08-12T07:00:39.791Z |
| Channel | claude |

---

# Weekly-отчёт — `design-token-drift` (неделя 2026-33)

## Находки

- **Нет прямого доступа к дереву `apps/client/src`** в текущем прогоне job — статический diff токенов против фактических классов не выполнялся. Отчёт построен как чеклист + анализ контракта DESIGN.md против типовых Tailwind/DaisyUI паттернов. Требуется подключить обход файлов (glob `apps/client/src/**/*.{tsx,css}`) для инструментального прогона.
- **Двойной источник цвета: CSS-переменные vs DaisyUI-семантика.** DESIGN.md задаёт палитру через `--color-*` (например `--color-accent: #7C3AED`), а карточка детектора и sample-labels оперируют семантическими бейджами DaisyUI (`badge-warning`, `badge-info`, `accent`). Это точка вероятного дрейфа: значение `accent` в теме DaisyUI должно быть привязано к `#7C3AED`, иначе `badge-accent` и `--color-accent` разъедутся.
- **Риск hard-coded HEX вместо токенов.** Значения вроде `#0A0F1A`, `#111827`, `#7C3AED` легко попадают в компоненты напрямую (`bg-[#0A0F1A]`, inline-style) в обход переменных — типичный источник drift в Tailwind-проектах с arbitrary values.
- **Скругления имеют два номинала (8 px карточки / 6 px мелкие контролы)**, которым в Tailwind обычно соответствуют кастомные `rounded-*`. При использовании дефолтных `rounded-lg`/`rounded-md` (0.5rem=8px / 0.375rem=6px) совпадение случайно и хрупко — нужен явный маппинг в `tailwind.config`.
- **Семантическое совпадение `warning` для разных сущностей.** `label=drone` → `badge-warning`, «Захват жёсткий» → `badge-warning`, а иконка семейства `agentic` тоже `warning`. Один визуальный сигнал несёт три разных смысла — не token-drift в строгом смысле, но риск для «не только цветом» из раздела A11y.

## Риски

- **Расхождение темы DaisyUI ↔ `--color-*`.** Если `data-theme` не пересобран из палитры DESIGN.md, `accent/info/warning/error` могут не совпасть с `--color-accent`/`--color-danger`. `--color-danger: #EF4444` должен соответствовать `error`.
- **Arbitrary values (`bg-[...]`, `text-[14px]`, `rounded-[8px]`)** обходят токены и не отслеживаются линтером — накапливают тихий drift между экранами редактора и анализатора.
- **Тайминги анимаций (150–200 ms обычные, 400–500 ms live-детекция).** Tailwind `duration-150/200` покрывают обычные, но live-диапазон нестандартен; риск, что сырой `isDrone` повесят на быстрый переход в обход EMA/гистерезиса из `LIVE_DETECTION_UI.md` §1.
- **A11y: контраст `--color-text-muted #9CA3AF` на `--color-surface #111827`** близок к границе WCAG AA для мелкого `text-xs` (reasoning/fundamentals/latency в карточке детектора) — требует прямой проверки коэффициента.
- **Фокус-кольцо `2px accent`** легко теряется при переопределении `ring`/`outline` в кастомных контролах DaisyUI (особенно `progress`, `skeleton` в loading-состоянии).

## Рекомендации

1. **Подключить файловый обход к job**: glob по `apps/client/src`, grep на arbitrary HEX (`#[0-9A-Fa-f]{6}` в className/style) и на `-\[` (arbitrary Tailwind) — вывести список нарушителей в следующий weekly.
2. **Единый источник истины для темы**: сгенерировать DaisyUI `data-theme` из палитры DESIGN.md и добавить assert-тест `accent===#7C3AED`, `error===#EF4444`, `info/warning/ghost/neutral` зафиксированы; запретить hard-coded HEX через ESLint-правило (`no-arbitrary-color`).
3. **Зафиксировать `tailwind.config`**: явные `borderRadius` (card=8px, control=6px), `fontSize` шкала `12/14/16/20/24`, `transitionDuration` включая `live` (400–500 ms) — чтобы токены имели имена, а не совпадали случайно.
4. **Проверить контраст руками**: `--color-text-muted` на `--color-bg` и на `--color-surface` для `text-xs`; при провале AA — поднять яркость muted либо запретить его для 12px.
5. **Аудит «не только цветом»**: убедиться, что `drone/not-drone`, «мягкий/жёсткий захват», статус детектора сопровождаются иконкой/текстом, а не только `badge-warning`/`badge-info` — особенно там, где `warning` переиспользован для трёх сущностей.

## Чеклист ручной проверки (до автоматизации)

- [ ] `grep -rn '#[0-9A-Fa-f]\{6\}' apps/client/src` — прямые HEX вне темы.
- [ ] `grep -rn '\[[0-9]' apps/client/src` — arbitrary Tailwind (`w-[…]`, `text-[…px]`, `rounded-[…]`).
- [ ] `padding`/`gap` вне сетки 8px (не кратные 4).
- [ ] Кликабельные зоны < 40px высоты.
- [ ] `focus-visible` присутствует на всех интерактивах; кольцо на `accent`.
- [ ] `tabular-nums` на confidence/частотах/latency карточки детектора.
- [ ] `aria-live="polite"` только на **стабильном** статусе (не сырой `isDrone`).
- [ ] Latency-строка всегда в разметке (не условный рендер).
