#!/usr/bin/env node
import { Client } from 'ssh2';
import { getOfficeSshConfig } from './_ssh-office-config.mjs';

const cmd = [
  'cd /root/membrana',
  'docker compose \\',
  '  -f packages/background-office/docker-compose.yml \\',
  '  -f deploy/background-office.prod.compose.yml \\',
  '  --env-file /etc/membrana/office.env \\',
  '  ps 2>/dev/null || echo "office stack not running yet"',
  'docker compose \\',
  '  -f packages/background-office/docker-compose.yml \\',
  '  -f deploy/background-office.prod.compose.yml \\',
  '  --env-file /etc/membrana/office.env \\',
  '  logs office-api --tail 30 2>/dev/null || true',
  'curl -fsS http://127.0.0.1:3000/health 2>/dev/null && echo || echo "health: not reachable"',
].join('\n');

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (c) => {
        conn.end();
        process.exit(c ?? 0);
      });
    });
  })
  .on('error', (err) => {
    console.error(err);
    process.exit(1);
  })
  .connect(getOfficeSshConfig());
