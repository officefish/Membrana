# Checks — Block `refusal-contract` (A), Phase 2 · 06.09.2026

Норма 03.09 «проверка без предмета»: у каждого зуба назван предмет и хотя бы одна порча,
дающая красный. Все порчи прогнаны руками (мутация → прогон → красный → `git checkout`),
дерево после — чистое.

## Зелёные прогоны (финальные, на восстановленных исходниках)

| Команда | Предмет | Результат | Файлов взяла проверка |
|---|---|---|---|
| `npx vitest run src/modules/samples src/modules/firebat-node src/modules/buffer-cleanup src/modules/library-open-api` (media) | контракт отказа, реестр эпизодов, словарь-один-модуль, соседи `SamplesService` | 12 файлов, **86 passed** | 12 тест-файлов |
| `npx vitest run` (plugin-contracts) | словарь + старый `index.test.ts` | 2 файла, **33 passed** | 2 |
| `npx tsc --noEmit` (media) | весь пакет, включая относительный `import type` через reference | **0 ошибок** | 158 `.ts` в `src` |
| `yarn typecheck` (plugin-contracts: `tsc --noEmit` + `tsc -p tsconfig.test.json`) | словарь и типовые `Equal` в тестах | **ok** | 14 `.ts` |
| `yarn workspace @membrana/background-media verify:swagger` | `dist` swagger: 37 путей + обе формы upload | **Swagger OK**; `201 stored · 200 refusal (enum = словарь) · 413 transport-only` | документ целиком |
| `eslint src/modules/samples`, `eslint src/buffer-overflow` | мои файлы | **0 problems** | 13 + 4 |
| зуб `buffer-overflow-dictionary.test.ts` | боевые исходники `plugin-contracts/src`, `background-media/src`, `background-media/scripts` | 7 passed | **124 файла** отсканировано |

## Порчи → красный

| # | Порча | Что покраснело |
|---|---|---|
| P1 | `throw new HttpException('…quota exceeded', 413)` перед отказом в `uploadOrRefuse` | `samples.service.refusal.test.ts` + `buffer-overflow-dictionary.test.ts`: **14 failed** / 23 |
| P2 | Реестр чеканит новый id при открытом эпизоде (снята строка `if (existing) return existing`) | `overflow-episode-registry.test.ts` + «100 отказов»: **3 failed** / 22 |
| P3 | `delete()` не зовёт `release` | «удаление пробы из оси закрывает эпизод»: **1 failed** / 16 |
| P4 | Вторая копия `'device_buffer_full'` в `samples.dto.ts` | «литерал существует ровно в двух файлах»: **1 failed** / 7 |
| P5 | Субъекты перепутаны в mapper (буфер → `user_storage_full`; `satisfies` пропускает — оба литерала валидны) | различимость двух литералов: **4 failed** / 16 |
| P6 | Третий литерал `PORCHA: 'quota_exceeded'` в словаре | рантайм **4 failed** («ровно два», предикат) **и** `tsc -p tsconfig.test.json`: TS2344 на `Equal<BufferOverflowReason, …>` |
| P7 | `isBufferOverflowRefusal` принимает `ok: true` | «отвергает: ok: true»: **1 failed** / 16 |
| P8 | Описание 413 снова `'Device storage quota exceeded'` | `verify:swagger` exit 1: «413 must be described as transport-only», «413 must not describe quota» |
| P9 | Лишний литерал в swagger-enum `reason` | `verify:swagger` exit 1: «reason enum […,"porcha_extra"] != dictionary […]» |

Порча, которую сдать не могу в изоляции (координатор, Phase 4): «временная константа
`overflow-policy.temporary.ts` осталась после интеграции → красный» — предмет появится вместе
с полем B.
