# a1 · Веснин · архитектурный gate

**Предмет:** граница live/batch для прогона детекторов по коллекции.

Консилиум выбрал развитие существующих `CollectionSampleReader` и collections plugin request.
Новый `SampleCollectionRef`, новый core runtime и пишущая дверь не вводятся. Массовый перенос и
пагинация признаны уже закрытыми стволом и исключены из исполнения #494.

**Evidence:** `docs/seanses/batch-collection-run-contour-architecture-gate-2026-09-29.md`.

**Gap:** отдельный platform-level batch runtime остаётся возможным будущим решением, но этот
спринт не создаёт для него преждевременный контракт.
