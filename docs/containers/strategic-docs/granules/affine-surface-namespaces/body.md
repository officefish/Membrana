## Namespaces

**Namespace** — папка внутри workspace с именем **container id** (не git-тип артефакта).

| Git-контейнер | Affine namespace |
|---------------|------------------|
| `docs/containers/strategic-docs/` | `strategic-docs` |

Документы контейнера лежат **flat** под `strategic-docs/` — **тип** задаётся **title + metadata**, не Affine-папкой.

Паттерн: [`GROUP_CONTAINERIZATION`](../../../../patterns/GROUP_CONTAINERIZATION.md) — один git-контейнер → один namespace.
