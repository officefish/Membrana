# Отчет по текущим GitHub Issues

**Дата среза:** 2026-06-30  
**Репозиторий:** `officefish/Membrana`  
**Источник:** `gh issue list --state open --limit 200` и точечная проверка связанных Issue/PR  
**Владелец отчета:** Vesnin (Teamlead)

## 1. Резюме

- Открыто **23 issues**.
- У **23 из 23** нет assignee и milestone.
- **10 issues** ожидают Teamlead-триажа (`status:triage`).
- Самые старые открытые задачи созданы 2026-05-14.
- Открытых PR на момент среза нет.
- `tdoa-localizer-spec-s1` не входит в текущий backlog: Issue [#211](https://github.com/officefish/Membrana/issues/211) закрыта 2026-06-30, PR [#213](https://github.com/officefish/Membrana/pull/213) merged.

Главный вывод: текущий долг находится не в очереди PR, а в несинхронизированном Issue backlog. Сначала нужно проверить уже реализованные или утратившие актуальность issues, затем назначить владельцев и только после этого открывать новые спринты.

## 2. Очередь A: аудит и возможное закрытие

| Issue | Почему требует проверки | Следующее действие | Владелец |
|---|---|---|---|
| [#146](https://github.com/officefish/Membrana/issues/146) W0-H1: палитра в function editor | PR #162 с соответствующим fix уже merged | Сверить acceptance criteria с `main`; закрыть либо зафиксировать остаток | Rodchenko |
| [#151](https://github.com/officefish/Membrana/issues/151) Epic W0 hotfixes | Дочерний backlog старый; часть исправлений уже merged | Проверить #146/#152/#153 и закрыть эпик при полном DoD | Vesnin |
| [#95](https://github.com/officefish/Membrana/issues/95) Device-Board Refactor v0.4 | Большой эпик без обновлений после серии DBR PR | Сопоставить DBR0-DBR6 с merged PR и registry | Ozhegov |
| [#54](https://github.com/officefish/Membrana/issues/54) MCP rollout acceptance | Майская acceptance-задача могла быть поглощена последующими MCP-спринтами | Проверить composite test и deployment record; закрыть или сузить остаток | Ozhegov |
| [#7](https://github.com/officefish/Membrana/issues/7) agenda store/registry tests | Старый тестовый долг мог быть частично закрыт поздними CI-работами | Сверить каждый acceptance пункт с текущими тестами | Ozhegov |
| [#8](https://github.com/officefish/Membrana/issues/8) client registration smoke tests | Нет свежего статуса при активном развитии client registry | Проверить существующий smoke coverage и оформить остаток | Ozhegov |
| [#9](https://github.com/officefish/Membrana/issues/9) microphoneStreamHub tests | Высокий ROI, но issue не обновлялась с создания | Проверить replay/unsubscribe/isolation тесты | Kuryokhin |
| [#10](https://github.com/officefish/Membrana/issues/10) FFT math tests | Часть математики могла получить тесты в detector-спринтах | Провести матрицу acceptance criteria по `fft/metrics/statistics` | Dynin |
| [#11](https://github.com/officefish/Membrana/issues/11) viz config tests | Небольшой долг без движения | Проверить текущую нормализацию и тесты; закрыть одним S-PR при пробеле | Rodchenko |
| [#34](https://github.com/officefish/Membrana/issues/34) FFT edge-case docs | Зависит от фактического контракта и тестов #10 | После аудита #10 обновить документацию либо закрыть как выполненное | Dynin |

## 3. Очередь B: исполняемый backlog

| Приоритет | Issue | Решение / зависимость | Владелец |
|---|---|---|---|
| P0 | [#94](https://github.com/officefish/Membrana/issues/94) детерминированный deploy | Системный риск production; декомпозировать DR0-DR7 и назначить ближайший инкремент | Vesnin |
| P0 | [#157](https://github.com/officefish/Membrana/issues/157) dissolve comment group | Пользовательский риск потери узлов; отдельный S/M sprint с тестом undo/save-reload | Rodchenko |
| P1 | [#195](https://github.com/officefish/Membrana/issues/195) Intern T1 outbound self-check | Первый шаг intern-цепочки, блокирует T3 | Ozhegov |
| P1 | [#196](https://github.com/officefish/Membrana/issues/196) Intern T2 health/ready | Выполнять после переиспользуемой логики T1 | Ozhegov |
| P1 | [#197](https://github.com/officefish/Membrana/issues/197) Intern T3 research digest | После T1 и решения куратора о теме/команде | Vesnin |
| P1 | [#187](https://github.com/officefish/Membrana/issues/187) headroom live measurement | Нужен реальный сеанс и фактический perf report | Kuryokhin |
| P1 | [#59](https://github.com/officefish/Membrana/issues/59) background-media production deploy | Выполнять только через gates из #94 и готовность #58 | Vesnin |
| P1 | [#58](https://github.com/officefish/Membrana/issues/58) background-media v1 | Сверить фактическую готовность epic и остаток до production | Ozhegov |
| P2 | [#92](https://github.com/officefish/Membrana/issues/92) Node Realtime Gateway | Отдельный платформенный epic; не смешивать с TDOA/runtime | Ozhegov |
| P2 | [#57](https://github.com/officefish/Membrana/issues/57) trends-fft template editor | Продуктовый backlog после стабилизации detector/template contracts | Rodchenko |
| P2 | [#49](https://github.com/officefish/Membrana/issues/49) MicrophoneCapturePanel | UI/audio работа с единым владельцем реализации | Rodchenko |
| P2 | [#33](https://github.com/officefish/Membrana/issues/33) telemetry journal a11y | Сузить Storybook как отдельную опцию; сначала базовый a11y | Rodchenko |
| P2 | [#27](https://github.com/officefish/Membrana/issues/27) FFT/Oscilloscope a11y | Объединить инфраструктурную часть Storybook с #33, не смешивая acceptance | Rodchenko |

## 4. Рекомендуемая последовательность

| Шаг | Результат | Ответственное лицо |
|---|---|---|
| 1 | Закрывающий аудит очереди A с доказательствами `done / residual / obsolete` | Vesnin |
| 2 | Назначение assignee, milestone и приоритета всем оставшимся issues | Vesnin |
| 3 | P0 sprint по #157 | Rodchenko |
| 4 | Декомпозиция и первый безопасный инкремент #94 | Vesnin |
| 5 | Последовательная intern-цепочка #195 → #196 → #197 | Ozhegov |
| 6 | Сверка epic #58 и gate к deploy #59 | Ozhegov |
| 7 | Планирование P2 по продуктовой ценности после очистки backlog | Vesnin |

## 5. Definition of Done для очистки backlog

- Для каждой открытой issue назначены ровно один assignee и один ближайший статус.
- Каждая issue имеет milestone либо явную метку `deferred` с условием возврата.
- Реализованные задачи закрыты со ссылкой на commit/PR и результат проверки acceptance criteria.
- Частично реализованные задачи сокращены до фактического residual scope.
- Дубли и устаревшие задачи закрыты с объяснением, а не оставлены в triage.
- Новая реализация начинается только после завершения закрывающего аудита очереди A.

## 6. Ограничения отчета

Это управленческий срез по состоянию GitHub и видимым связям. Статус `возможно выполнено` не считается основанием для автоматического закрытия: для каждой такой issue требуется проверка кода, тестов и acceptance criteria на актуальной основной ветке.
