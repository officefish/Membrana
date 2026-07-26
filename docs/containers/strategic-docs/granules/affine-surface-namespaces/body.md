## Namespaces

**Namespace** — папка внутри workspace с именем **container id** (не git-тип артефакта).

| Git-контейнер | Affine namespace |
|---------------|------------------|
| `docs/containers/strategic-docs/` | `strategic-docs` |

Документы контейнера живут в namespace `strategic-docs/` (UI-папка).  
`--push` дополнительно вешает **tag** с тем же именем — у affine-cli нет folder/collection API.

Тип документа задаётся **title** (content + meta pair), не подпапкой `granules/` / `templates/`.

Паттерн: [`GROUP_CONTAINERIZATION`](../../../../patterns/GROUP_CONTAINERIZATION.md) — один git-контейнер → один namespace.
