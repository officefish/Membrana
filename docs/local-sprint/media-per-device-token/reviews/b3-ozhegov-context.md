# b3 context — Ozhegov

Предмет: кабинет сохраняет форму `PairResponse`, но перестаёт класть в `mediaToken` служебный media token.

Контекстный вывод: новый media device берёт raw client key из registration response; существующий media device требует новый raw через rotate endpoint, потому прежний raw не хранится.

Подпись: ozhegov · context_run · b3-cabinet-pair-bridge.
