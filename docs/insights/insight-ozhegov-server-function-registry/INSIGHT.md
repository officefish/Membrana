# INSIGHT: ServerFunctionRegistry в @membrana/core

| Поле | Значение |
|------|----------|
| **ID** | `insight-ozhegov-server-function-registry` |
| **Статус** | adopted |
| **Источник** | virtual-team-ozhegov |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение (Ожегов)

User insight `insight-server-forwarding` описывает server functions, но контракт размажется по device-board, cabinet, media без **единого термина** в core. Риск: циклы client↔background, дубли `StartAsyncJob` ad hoc, palette nodes без schema.

## Гипотеза

**ServerFunctionRegistry** в `@membrana/core` (минимальный контракт):

```ts
// sketch
interface ServerFunctionDescriptor {
  id: string;
  inputKinds: RefKind[];
  outputKind: RefKind;
  tier: 'bundled' | 'integration';
  tariffSku?: string;
}
```

- Пакеты: device-board (palette), cabinet (auth/quota), media/worker (execute) — **только через registry index**.
- Feasibility agent читает тот же manifest.

## Scope

- In: types in core, JSON manifest `server-functions/v1.json`, re-export index
- Out: worker implementation, billing

## Связи

- `insight-server-forwarding`, `insight-agent-scenario-builder`, `ARCHITECTURE.md` §1d
