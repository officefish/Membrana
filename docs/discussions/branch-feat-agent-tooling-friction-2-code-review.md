# Review: ветка feat/agent-tooling-friction-2 — первая половина (ti-6/5/7/4) (#469)

> Проведено в IDE-чате по CODE_REVIEW_REGULATION v0.2 (Anthropic API — кредит
> исчерпан; формат «chat without script»). База: origin/main. Частичный мёрж
> по готовности — форма спринта из консилиума; ti-3/2/1 идут следом.

Tier: T1

[Teamlead]: Четыре независимых ti по консилиуму agent-tooling-friction-2 (гейт пройден до кода): ti-6 verify:encoding (гард BOM/mojibake + allow-маркер; живой прогон вычистил 4 исторических файла — 3 BOM и 27 битых строк архивного HANDOFF восстановлены iconv-роундтрипом построчно), ti-5 persona:memory --all + хвост ritual:evening с || true, ti-7 единая credit-подсказка в общем хелпере printAnthropicHttpError + отдельный throw-путь insight, ti-4 yarn neighbors (только чтение сигналов, реестр из origin/main). Всё scripts/-слой + package.json + строка в скилл; пакетный граф не тронут. Запреты консилиума соблюдены. PR size умеренный. **LGTM**.
[Структурщик]: Чистые функции экспортированы и тестируемы во всех четырёх (detectEncodingIssues, runForSlug-цикл, isCreditExhausted/CREDIT_FALLBACKS, renderNeighbors/todayActiveCards); isMain-гарды по паттерну спринта-предшественника. neighbors координационный файл не вводит — карточка остаётся единственным claim (вердикт консилиума). Хвост ритуала вставлен после архива дня, до code-review — позиция по консилиуму.
[Математик]: Сигнатуры mojibake консервативны (расширенная кириллица после в/Р/С; «Рёв» — контрпример в тесте, ложных срабатываний на 1673 файлах после маркеров нет); allow-маркер снимает только mojibake, BOM проверяется всегда (тест). Живое тело credit-ошибки 14.07 — регресс-фикстура. --all агрегирует max exit-code — семантика check сохранена.
[Музыкант]: || true-семантика хвоста ритуала — ритуал не падает от сломанного рефреша; gh-мигания в neighbors деградируют в честную строку «недоступно», не в падение.
[Верстальщик]: Вывод всех четырёх — статус словом, без ANSI (закреплено тестами neighbors/credit-hint); пустые состояния neighbors честные («тихо — новых коммитов нет»); памятка про пересечение скоупа — в конце сводки.

P0/P1: —
P2: ti-4 фильтр свежих веток по относительной дате («minute/hour») — грубый, но достаточный; точная фильтрация по timestamp — opportunity. verify-encoding сканирует только tracked-файлы — осознанно (gitignored-артефакты вне контракта).
Checks: yarn test:scripts — pass 287/287 (12 новых тестов четырёх ti); yarn verify:encoding — OK (1673 файла); yarn persona:memory --all --check — OK ×5; живой прогон yarn neighbors — сводка корректна (поймал PU2/PU3 соседа).
Вердикт: LGTM
