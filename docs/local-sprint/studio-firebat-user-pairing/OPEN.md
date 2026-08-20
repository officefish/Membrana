# Membrana Local Sprint OPEN: studio-firebat-user-pairing

| Поле | Значение |
|------|----------|
| Sprint | `studio-firebat-user-pairing` |
| Procedure | `membrana-local-sprint` |
| Registry card | `studio-firebat-user-pairing` (L, магистраль 20.08 owner-choice; Issue с первым PR) |
| Prompt | [`STUDIO_FIREBAT_USER_PAIRING_PROMPT.md`](../../prompts/STUDIO_FIREBAT_USER_PAIRING_PROMPT.md) |
| Cut plan | [`studio-firebat-user-pairing.json`](../../sprint/cut/studio-firebat-user-pairing.json) · ратифицирован владельцем 2026-08-20T10:16Z («Ратифицирую») |
| Cutter context | Веснин, `yarn ask vesnin` 20.08, два захода → [`cut-studio-firebat-user-pairing.md`](../../discussions/cut-studio-firebat-user-pairing.md) |
| Lead | vesnin |
| Support | ozhegov · rodchenko |
| Status | open · execute |

## Зачем

Слово владельца 19.08: многопользовательская система — работаем не скриптами, а через Studio
(Electron) с авторизацией пользователя; датасет = набор конкретного пользователя; ключи выдаёт
кабинет (парринг построен — не строить заново). Сегодня: Studio на Firebat, связка ключом из
кабинета, первые записи в набор пользователя. Разведка: парринг целый end-to-end, но раздаёт
каждому клиенту СЛУЖЕБНЫЙ mediaToken в голом localStorage — долг фиксируется ADR-0028 (b5),
чинится отдельным спринтом.

## Блоки

| Блок | Персона | Зона | Оценка | Статус |
|------|---------|------|-------:|--------|
| b2 порт хранения кредов | ozhegov | порт + два адаптера | 130 | исполнен · подпись Ожегова |
| b3 словарь API (после b2) | dynin | 8 зубов-предикатов | 80 | исполнен · «Да» Дынина |
| b4 IPC Studio (после b3) | rodchenko | канал + мост, шифрование за флагом | 120 | исполнен · подпись Родченко |
| b5 ADR-0028 долг mediaToken (∥) | vesnin | ADR записана | 90 | исполнен · подпись Веснина |
| b6 приёмка (замыкает) | tarasov | таблица вещдоков заполнена | 60 | исполнен · LGTM Тарасова 20.08 |

Операционные шаги владельца (не блоки): установка Studio с флешки на Firebat → вход →
ключ из кабинета → парринг → запись. Порядок — в документе приёмки b6.

Вне спринта: смена контракта PairResponse, включение шифрования safeStorage, ротация
mediaToken — спринт `media-per-device-token` после ADR-0028.
