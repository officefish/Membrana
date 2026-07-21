# Промпт: K1 — дом kits/ + схема манифеста

> **M** · `kam-k1-home` · [#816](https://github.com/officefish/Membrana/issues/816) · lead **ozhegov** · parent `kits-angelina-morning`

## Контекст

После K0: границы эпика зафиксированы. K1 создаёт дом слоя `kits/` и единственную
схему манифеста — **потребляя** pl-r3 / sbc-s3, без острова под `scripts/`.

## Промпт целиком

1. Каталог [`kits/`](../../kits/README.md): README-контракт слоя (термины, layout,
   что писать/запрещено, режимы latest/pinned, чеклист PINNED_SUBGRAPH).
2. [`kits/MANIFEST.schema.json`](../../kits/MANIFEST.schema.json): `id`, `leadPersona`,
   `roots`, `pins` (path→40hex); `additionalProperties: false`.
3. Провода: `docs/procedures/README.md` § киты, `scripts/README` § Киты — ссылки на
   дом/схему; явный запрет `scripts/**/kits*.schema.json`.
4. Жильцов не добавлять (это K3). Аудит SHA — K2.

## DoD

- [x] `kits/README.md` + `MANIFEST.schema.json`
- [x] Ссылки на pl-r3 / layer-rules / #761
- [x] Нет параллельного острова в `scripts/`
- [x] LGTM ozhegov (owner ok 2026-07-21)

## Out of scope

Первый кит (`angelina-morning`), зуб аудита подграфа, `kitVersion` на процедуре утра.
