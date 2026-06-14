# Detectors benchmark v0.2 — free-v1 catalog

120 real-world WAV samples (5 s, 48 kHz mono): 60 drone / 60 not-drone.

- **catalogId:** `free-v1-catalog`
- **Source corpus:** `docs/datasets/samples/real-collection/`
- **Sync:** `yarn dataset:sync-free-v1` → this directory + `apps/client/public/catalog/free-v1/`
- **UI:** seeded into `__tariff_dataset__` on client `init()` (bundled catalog)
- **Benchmark:** `yarn benchmark:detectors`

v0.1 synthetic dataset remains for legacy CI-smoke only.
