# Headroom proxy — local performance measurement

The proxy is optional and must not receive `.env`, credentials, WAV data, or private recordings.
Load [`headroom.env.example`](./headroom.env.example) so `packages/core/src` stays outside compression.

## Run

1. Start the local proxy in a separate terminal:

   ```bash
   headroom proxy
   ```

2. Route one Claude Code session through it:

   ```bash
   ANTHROPIC_BASE_URL=http://localhost:8787 yarn claude:code
   ```

3. After the session, write the measurement:

   ```bash
   headroom perf --format json > docs/insights/insight-headroom-server-deploy/proxy-perf-report.json
   ```

Do not treat the proxy as permanent until the report is reviewed. The proxy session itself is a
manual daytime operation and is outside the Night Build scope.
