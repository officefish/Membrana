# b1 context — Ozhegov

Предмет: NodeKey получает audience `node | client` без смены модели хранения raw-secret: сервер хранит только hash, raw возвращается один раз.

Контекстный вывод: default audience обязан остаться `node`, чтобы ADR-0027 ручки узла не получили миграционный перелом. Client key должен быть отдельным active-key рядом с node key, а не заменой node key.

Подпись: ozhegov · context_run · b1-media-key-audience.
