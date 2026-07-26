## Workspaces

В Affine — **ровно два** top-level workspace:

| Workspace | Роль |
|-----------|------|
| **Templates** | Конструктор: редактируемые granules + template skeletons + metadata |
| **Releases** | Опубликованные read-only snapshots после `yarn strategic-docs:generate` |

**Неправильно (отменено):** зеркалить git-папки `granules/`, `templates/`, `releases/` как подпапки в Affine.
