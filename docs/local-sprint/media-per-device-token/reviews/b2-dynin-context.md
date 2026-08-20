# b2 context — Dynin

Предмет: media должен принять новый client audience key на уже существующих device-scoped client surfaces, не меняя `apps/client`.

Контекстный вывод: проверка сводится к предикату `token == service` OR `verify(token, deviceId, audience=client) == ok`, после чего прежний `DeviceGuard` оставляет device existence и optional `X-Membrana-Device-Id` invariant.

Подпись: dynin · context_run · b2-media-client-access.
