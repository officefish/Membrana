# Interface Consilium: static registry read API

| Поле | Значение |
|---|---|
| sprint | `cowork-static-registry-read-api` |
| phase | 3 |
| date | 2026-08-09 |
| coordinator | Codex |
| verdict | **ACCEPT-WITH-ADAPTERS** |

## Frozen inputs

| Block | Freeze SHA | Own DoD |
|---|---|---|
| `registry-contract` | `cbba747e6c990a4c106e095ee24925799214492d` | 24/24 tests, lint, typecheck |
| `registry-index` | `d09dc34a41a7ab23ab419c729af79b047052bc9d` | 14/14 tests, build, typecheck |
| `read-api` | `44630395a44e7d6536a839984ae4eb2c5ea6e209` | 8/8 tests, lint, typecheck |

Три `EXPECTATIONS.md` и публичные поверхности кода были открыты командам одновременно
после freeze. Production-код в Phase 3 не менялся.

## First finding: coordinator embargo breach

После Phase 1 координатор одновременно прочитал три первых `EXPECTATIONS.md`, хотя первое
вскрытие назначено только после Phase 2. Команды не читали чужие материалы, не получили от
координатора сведений о соседях и сдали независимо различающиеся поверхности. Поэтому ни один
block output не объявлен compromised, но процесс получил S-C3-подобную находку координатора.

Обязательная запись в retrospective: `coordinator exposure; no team information flow found`.
Лечение — отдельный машинный `cowork:reveal`: до трёх freeze SHA координатор видит только
пути и хеши `EXPECTATIONS.md`; акт вскрытия журналируется один раз для всех блоков.

## Positions

| Block | Position | Несущее |
|---|---|---|
| `registry-contract` | ACCEPT-WITH-ADAPTERS | parser остаётся единственным production parser; strict M2 grammar ведёт |
| `registry-index` | ACCEPT-WITH-ADAPTERS | snapshot переводится в local index shape; line decoder остаётся test/alternate injection surface |
| `read-api` | ACCEPT-WITH-ADAPTERS | существующий async port сохраняется; domain errors и redaction сводит adapter |

Все три позиции считают различия конечной adapter-работой. Несводимого конфликта моделей нет;
S-C2 и дополнительное слово владельца не требуются.

## Resolved seams

1. `parseStaticRegistryJsonl` целиком принимает или отвергает JSONL.
2. Snapshot adapter переводит `recordId` в index `id` и явно копирует validated record в
   JSON-compatible payload. Второй production parser запрещён.
3. Index read adapter реализует frozen `StaticRegistryReadPort`: unknown становится
   `not-found`, malformed остаётся `400`, invariant failure не превращается в partial `200`.
4. Строгая грамматика M2 `^[a-z0-9][a-z0-9-]{2,63}$` ведёт над более широкими локальными
   validators index/API и проверяется adapter до lookup.
5. DTO строится allow-list; `location`, `location.ref`, Affine id и содержимое файла не
   пересекают HTTP boundary.
6. Current `addedAt` содержит calendar dates; integration проверяет их без нормализации времени.

## Access boundary

R3 требует Panel как единственного канонического авторизатора до выдачи metadata. Фаза
`#1303-B` ещё не выполнена, поэтому этот коворк **не монтирует** `StaticRegistryModule` в
production `AppModule` и не объявляет endpoint публичным или live. Handlers, OpenAPI и runtime
composition проходят isolated integration smoke; production mount принадлежит зависимой фазе
`static-mmbrn-ingress-auth` после Panel forward-auth.

## Deployment seam

Финальный adapter должен учитывать не только TypeScript graph. Office image сейчас не несёт
`docs/evidence/registry.jsonl` и новый service workspace. Integration owner добавляет package
manifests/dependencies и согласованные `.dockerignore` + Dockerfile build/runtime COPY. Smoke
образа обязан доказать наличие registry source и runtime package targets.

## Verdict

Три блока принимаются все вместе. Координатор пишет adapters и wiring только по
[`INTERFACE_CONTRACT.md`](../cowork-sprint/cowork-static-registry-read-api/INTERFACE_CONTRACT.md),
не заменяя блоки новой реализацией. После integration smoke открывается Phase 5 с одним PR и
exact-SHA Teamlead review.
