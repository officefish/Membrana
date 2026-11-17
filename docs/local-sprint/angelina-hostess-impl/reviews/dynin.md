# M5 review — Dynin

PASS. The rejected verdict schema names four required fields, and the void inventory is
fail-closed. The schema lives in `docs/void/registry.json`; `verify-void-barriers` reads it and
rejects a grave missing any named field. An absent inventory is red; an empty inventory is
accepted only under `no-owner-condemned-exhibits`. No exhibit was guessed, moved, or deleted.
