# Обсуждение: block-orphans-reason-carried-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 09:09 UTC · dynin

**Вопрос:** Блок orphans-reason-carried спринта tooling-truth-orphans-diagnosis. Функция orphans() в scripts/lib/scripts-workshop.mjs раньше фильтровала носителей по belongs(...).kind==='orphan' и возвращала {status, orphans: string[], counted, denominator} — причина исхода предиката (ORPHAN_REASONS: no_rule | subject_unresolved) выбрасывалась. Стало: один проход по носителям строит verdicts:[{path,reason}], из них считается сводка byReason (объект reason->count), orphans остаётся массивом строк для обратной совместимости с соседями и --json, counted и denominator прежние. Замер после правки: counted 51, denominator 1000, byReason {subject_unresolved:51}, orphans[0] строка, verdicts[0] объект {path,reason}. Ответь как математик по пунктам: 1) есть ли инвариант, который обязан связывать byReason, verdicts и orphans, и как его сформулировать так, чтобы он был проверяем зубом, а не глазом; 2) правильно ли, что byReason обычный объект, а не Map, и что у незадействованной причины нет ключа с нулём — или ноль обязан присутствовать явно; 3) чего эта форма по-прежнему не отвечает про сиротство; 4) где здесь можно молча соврать зелёным.

**Ответ:**

Я вижу чистую задачу на **инвариант-контроль** и **(не)представимость**. Отвечу без воды.

## 1) Инвариант и его формализация

**Обязательный инвариант:**

```
sum(byReason[reason] for reason in keys(byReason)) === orphans.length
```

**И сильнее:**

```
for each verdict in verdicts:
  verdict.reason ∈ ORPHAN_REASONS  // конечный набор
  
for each reason in keys(byReason):
  byReason[reason] > 0  // нет нулевых ключей
  
verdicts.length === sum(byReason.values)
orphans.length === verdicts.length  // каждый вердикт ↔ одна сирота
```

**Проверяемо "зубом":**
```ts
function validateOrphansInvariant(result: OrphansResult): {ok: boolean; violation?: string} {
  const fromVerdicts = result.verdicts.length;
  const fromByReason = Object.values(result.byReason).reduce((a, b) => a + b, 0);
  const fromOrphans = result.orphans.length;
  
  if (fromVerdicts !== fromByReason) 
    return {ok: false, violation: `verdicts(${fromVerdicts}) ≠ byReason.sum(${fromByReason})`};
  if (fromOrphans !== fromVerdicts)
    return {ok: false, violation: `orphans(${fromOrphans}) ≠ verdicts(${fromVerdicts})`};
  
  for (const [reason, count] of Object.entries(result.byReason))
    if (count <= 0) return {ok: false, violation: `byReason[${reason}] = ${count} ≤ 0`};
  
  return {ok: true};
}
```

## 2) Object vs Map, нулевые ключи

**Правильно ли Object?** Да, если это **финальное представление** для JSON-сериализации.

**Должны ли нулевые ключи быть?** **Нет.** Вот почему:

- Нулевой ключ — это молча говорит: «эта причина существует, но её не было». Это **ложь через отсутствие информации**.
- Если `ORPHAN_REASONS = {no_rule, subject_unresolved}`, и обе встречаются, то обе в `byReason`. Если одна не встречалась — её не должно быть.
- Исключение: если есть `expected/required` перечень причин, и он фиксирован в API, — тогда возможна форма с нулями ради полноты. Но это надо **явно документировать**.

**Мой вывод:** Текущее поведение (отсутствие нулей) — честнее. Но тогда клиент обязан знать полный `ORPHAN_REASONS` и проверять его сам, если ему нужна исчерпывающая таблица.

## 3) Что здесь ещё не отвечается про сиротство

Структура дает **счёт** (какая причина и сколько раз), но молчит про:

- **Распределение по субъектам.** Например, все 51 `subject_unresolved` — это от одного сломанного субъекта или от разных? `byReason` это скрывает.
- **Хронология** — появились ли сироты кучей или размазаны? `verdicts` упорядочены по появлению, но нет `timestamp`.
- **Тяжесть.** `no_rule` — это ошибка конфига (легко исправить), `subject_unresolved` — ошибка данных (могут быть переходящими). Одна сводка не различает.
- **Достижимость из известного состояния.** Это orphans, которые **ожидаемо** сироты на данной версии кода, или это **регрессия**?

Ответ: нужна **вторая форма** (дашборд или детальный лог), где сироты разбиты по подклассам.

## 4) Где здесь молча соврать зелёным

- **Counted vs denominator.** Если `counted: 51, denominator: 1000`, то обратно-ликвидность: **49% успеха**. Но зелёнфилд может прочесть это как **79% (1000-51)**. Пороги и цвета должны быть явными в контракте.
- **Отсутствие нулей в byReason** — если клиент ждёт полный объект со всеми `ORPHAN_REASONS`, он затихо разберёт пустоту как ноль, а сервер на него не согласован.
- **Orphans как string[]** — если в `verdicts` тот же path представлен в другом формате (абсолютный vs относительный), сравнение `orphans.includes(...)` будет ложным молча.
- **"Обратная совместимость с соседями"** — если соседи ждут `orphans` как `{path, meta}[]`, а получат строки, они упадут, но только в runtime.

**Чек:** Добавь явный **версионный маркер** в результат (`format: 'v1'`) и тест на round-trip сравнение с ожиданием.

---
