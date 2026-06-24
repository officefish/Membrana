# Competition UserCase templates

Static `device-scenario` JSON for teams **alpha**, **beta**, **gamma**.

| File | Purpose |
|------|---------|
| `index.json` | Manifest for background-media loader |
| `<team>/device-scenario.json` | Full document with `meta.executionPolicy: competition` |

Regenerate after pack changes:

```bash
yarn usercase:export-competition-templates
```

Loader: `packages/background-media/src/lib/competition-templates.ts`.

Bundled embed (offline client catalog) remains in `@membrana/device-board` `default-usercase-mvp-microphone-*.generated.ts`.
