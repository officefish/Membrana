#!/usr/bin/env node
/**
 * yarn media:env:check — наличие MEDIA_API_URL + источник токена без печати секрета (#723).
 */
import { formatMediaEnvCheck, resolveMediaEnv } from './lib/media-token.mjs';

const resolved = resolveMediaEnv();
const report = formatMediaEnvCheck(resolved);
for (const line of report.lines) console.log(line);
process.exitCode = report.ok ? 0 : 1;
