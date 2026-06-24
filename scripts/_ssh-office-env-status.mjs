#!/usr/bin/env node
import { Client } from 'ssh2';
import { getOfficeSshConfig } from './_ssh-office-config.mjs';

const cmd = `bash -lc '
for k in ANTHROPIC_API_KEY LINEAR_API_KEY LINEAR_WEBHOOK_SECRET GITHUB_TOKEN API_INTERNAL_TOKEN; do
  v=$(grep "^$k=" /etc/membrana/office.env 2>/dev/null | cut -d= -f2- | head -c 8)
  if [ -z "$v" ]; then s=EMPTY
  elif [ "$v" = REPLACE_B ]; then s=PLACEHOLDER
  else s=set; fi
  echo "$k: $s"
done
docker compose -f /root/membrana/packages/background-office/docker-compose.yml \\
  -f /root/membrana/deploy/background-office.prod.compose.yml \\
  --env-file /etc/membrana/office.env exec -T office-api \\
  sh -c "test -n \\\"\\$ANTHROPIC_API_KEY\\\" && echo container_anthropic:set || echo container_anthropic:empty"
'`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (c) => {
      conn.end();
      process.exit(c ?? 0);
    });
  });
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
}).connect(getOfficeSshConfig());
