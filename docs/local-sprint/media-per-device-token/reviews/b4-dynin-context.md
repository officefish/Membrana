# b4 context — Dynin

Предмет: отзыв связки в кабинете должен каскадно отозвать media client key, но локальный revoke не должен зависеть от доступности media.

Контекстный вывод: каскад является side-effect после найденного `mediaDeviceId`; ошибка media должна быть названа в log warning, а не скрыта как зелёный remote outcome.

Подпись: dynin · context_run · b4-cabinet-revoke-cascade.
