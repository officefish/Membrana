# Teamlead review: DB-Trace P0–P3 (scenario chain)

> **Reviewer:** Vesnin (Teamlead)  
> **Branch:** `vesnin`  
> **Scope:** device-board scenario runtime chain — logging, unblock, server correlation, export UX

---

## LGTM summary

**Approve merge** после green CI. Архитектурные границы соблюдены:

| Слой | Изменения | OK |
|------|-----------|-----|
| `@membrana/device-board` | `runId`, event-branch done, host trace ports | ✅ |
| `@membrana/client` | bridge, trace buffer, trace context | ✅ |
| `@membrana/media-library-service` | trace hook, skipRefresh, trace-id header | ✅ |
| `@membrana/background-media` | CORS + pino `traceId`, P2002→409 | ✅ |

**Не нарушено:** media-library не зависит от device-board; Web Audio только через engine.

---

## Phase checklist

| Phase | DoD | Status |
|-------|-----|--------|
| P0 | Correlation + media-lib trace + cookbook | ✅ |
| P1 | skipRefresh, chain unblocked (log E2E) | ✅ |
| P2 | `X-Membrana-Trace-Id` + server pino | ✅ (deploy pending) |
| P3 | Copy trace / Download | ✅ |

---

## Risks / follow-ups

1. **Deploy `background-media`** — без деплоя P2002→409 и `traceId` на сервере остаются только локально.
2. **skipRefresh** — snapshot без полного refresh tariff catalog; UI library может отставать до ручного refresh (приемлемо для hot path).
3. **Trace buffer** — max 10k lines, in-memory only; достаточно для hackathon MVP.

---

## Deploy (background-media)

После merge PR на `main` / cherry-pick на prod:

```bash
# на VPS с /etc/membrana/media.env
cd /path/to/Membrana
git pull
yarn install --immutable
yarn media:docker:prod:build
yarn media:docker:prod:up
docker logs background-media 2>&1 | tail -20
```

Проверка trace после flush сценария:

```bash
docker logs background-media 2>&1 | grep 'b19f0e03-'
```

Клиент: hard refresh после деплоя client (Vite dev или cabinet build).

---

## Test plan (manual)

1. INFO on → Run MVP → flush tick → `upload-ok` → `publish-done`
2. Copy trace → вставить в файл, сравнить с cookbook
3. Paired mode → grep traceId на media-server
4. Duplicate title upload → 409 (не 500) после deploy media

---

**Verdict:** LGTM — merge PR, deploy media-server, smoke MVP scenario.
