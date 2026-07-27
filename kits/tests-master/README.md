# tests-master — кит тестового контейнера

Кит поставляет воспроизводимую оснастку для дома [`tests/`](../../tests/): каталог
тестовых данных, раннер `test:scripts`, селектор `smoke/gate/full` и чистое ядро
планирования.

**Owner пина:** `dynin`.
**Дом-заказчик:** [`tests/`](../../tests/README.md).
**ADR:** [`ADR-0018`](../../docs/adr/ADR-0018-tests-container-selective-gate-nightly-full.md).

## Режимы

| Режим | Когда | Поведение |
|---|---|---|
| `latest` | интерактивная разработка | можно видеть drift как предупреждение |
| `pinned` | ночь / автономный full | только от пина MANIFEST; drift блокирует |

## Корни и подграф

| Узел | Роль |
|---|---|
| `scripts/tests-container.mjs` | CLI мастерской: `audit/decompose/inspect`, `smoke/gate/full` |
| `scripts/test-scripts-run.mjs` | совместимый раннер `test:scripts` |
| `scripts/lib/tests-container.mjs` | граф импортов и выбор сетапов |
| `scripts/lib/test-scripts-plan.mjs` | группы, skips, план прогона |
| `tests/test-scripts.catalog.json` | данные набора вне `package.json` |

## Аудит

```bash
node scripts/tests-container.mjs --setup gate --list
node scripts/tests-container.mjs --decompose
node scripts/kits-audit.mjs --id tests-master
```

## Чеклист PINNED_SUBGRAPH

1. ✅ Единица версии — подграф в `MANIFEST.json`.
2. ✅ Пины — git blob SHA; копий файлов нет.
3. ✅ Аудит полноты — `node scripts/kits-audit.mjs --id tests-master`.
4. ✅ Режимы latest/pinned описаны выше.
5. ✅ Обновление пина — отдельный ревьюируемый коммит манифеста.
6. ✅ Владелец пина — `dynin`.
7. ✅ Дрейф виден как `sha_drift` / `missing_pin`.
