# Аудит C4

## Раунд 1 — SUBSTANCE BLOCK

Протокол: `docs/seanses/insight-archive-lifecycle-c4-history-model-2026-07-19.md`.

Append-only source, no-delete, C2 events, reopen/no-transcription и opaque C3 ref приняты.
Заблокированы:

- archive/current перепутаны с revoked/superseded и теряют независимую V-axis/None;
- EventEnvelope, exact payloads, correction и reducer/conflict semantics недостаточны;
- upcast не гарантирует version-explicit/path-independent deterministic replay;
- arbitrary `10^4` threshold и абсолютный запрет rebuildable cache не обоснованы;
- successor order предрешает C7 atomicity/concurrency;
- DoD захватывает implementation/UI/tests/C6;
- other-session/persona memory используются как premises;
- declared cyclic order нарушен после 15-й реплики.

Раунд не засчитывается; `ial-c4-history-model` остаётся active.

## Ручной resolution — один шов BLOCK

- Ручной `C4_VERDICT.md` закрыл event/reducer/view/upcast/cache gates.
- Первый independent audit заблокировал скрытый base-domain input: EventLog не создаёт
  исходные MANDATE/SLICE/representation/transcription relations.
- Добавлен immutable versioned `BaseContext`; replay теперь принимает BaseContext + EventLog,
  а два sources разделены по типам истины.
- Первый повторный audit потребовал уточнить ownership event-created IDs и cache recovery.
- Split уточнён: BaseContext владеет pre-existing seed, EventLog — event-created IDs/events;
  cache rebuild использует pinned BaseContext + EventLog.
- Финальный independent read-only re-audit: **PASS**.

Узел `ial-c4-history-model` допускается к архиву как завершённая meeting-фаза.

## Раунд 2 — SUBSTANCE BLOCK

Протокол: `docs/seanses/insight-archive-lifecycle-c4-history-model-r2-2026-07-19.md`.

Separate V intent, envelope/payloads, correction, upcast, cache boundary и sources приняты.
Заблокированы:

- reducer не определяет active/conflict semantics для нескольких assertions/revokes;
- discriminated event typing и ID/seq/freshness/reference invariants неполны;
- View A не имеет формулы; V=None ошибочно назван третьим enum-state;
- supersede/reopen effects и referential validity не определены;
- cyclic order нарушен после 18-й реплики.

Раунд не засчитывается; `ial-c4-history-model` остаётся active.
