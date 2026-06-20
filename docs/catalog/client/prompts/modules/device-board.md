# Модуль: `device-board` — Доска устройства

> **Catalog-спецификация** · статус: **draft** → цель эпика `db-doc-v04-mvp`: **stable**
> Реестр: `docs/catalog/client/registry.json`
> Концепт: [`DEVICE_BOARD_CONCEPT.md`](../../../../packages/device-board/DEVICE_BOARD_CONCEPT.md) · runtime: [`SCENARIO_RUNTIME.md`](../../../SCENARIO_RUNTIME.md)
> **Mintlify (MVP docs):** [`apps/docs`](../../../../apps/docs/README.md) · workflow: [`DOCUMENTATION_WORKFLOW.md`](../../../DOCUMENTATION_WORKFLOW.md)

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `device-board` |
| **Версия** | `0.4.x` |
| **Категория** | Устройства |
| **Lead** | Ozhegov (структура) + Vesnin (архитектура runtime) |

---

## 2. Зачем пользователю

1. Визуально собрать **signal**-топологию и **scenario**-граф (ветки onConnect / onStart / loops / onStop).
2. Запустить сценарий (Run/Stop), переключать normal/alarm, смотреть runtime-инспектор портов.
3. Объявлять переменные сценария и связывать get/set/print на канвасе.
4. Сохранять/загружать JSON сценария (persist через client host).

Пакет `@membrana/device-board` — UI + scenario runtime; **Web Audio** только через client host (`audio-engine-service`).

---

## 3. UX-состояния

| Состояние | UI |
|-----------|-----|
| edit | палитра нод, конструктор переменных, drag/connect на канвасе |
| runtime (`isRunning`) | канвас read-only; клик по узлу → входы слева / выходы справа; Print — последний вывод |
| dirty | кнопка «Сохранить» активна |
| validation errors | баннер pre-run |

---

## 4. Границы кода

| Слой | Путь |
|------|------|
| Пакет | `packages/device-board` |
| Client module | `apps/client/src/modules/device-board/` |
| Runtime host (I/O) | `createScenarioRuntimeHost.ts`, `scenarioMicJournalBridge.ts` |
| Регистрация | `registerClientModules.ts` → `MembranaRegistry.registerLazyModule` |

**Запрещено:** `new AudioContext()` / `getUserMedia` внутри `@membrana/device-board` — только host.

---

## 5. Зависимости

- `@membrana/core` — типы сценария, SocketType, variables
- `@membrana/agenda` — не зависит (client связывает)
- Services: `@membrana/audio-engine-service` (через client host)

---

## 6. Плагины

На этапе v0.4 отдельных client-плагинов у модуля нет; ноды палитры (Print, isValid, GetMicrophone, StartStreaming, GetAudioStream, GetSample, GetFFTFrame, …) — часть scenario graph в пакете device-board. **Node reference:** `apps/docs` (Mintlify).

---

## 7. Чеклист перед правками

1. Прочитать `DEVICE_BOARD_CONCEPT.md` и `SCENARIO_RUNTIME.md`.
2. Не нарушать границу пакетов (`device-board` ↛ `agenda`).
3. Тесты: `yarn workspace @membrana/device-board test`.
