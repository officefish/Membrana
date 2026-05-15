import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_PATH = '.env';
const KEY = 'GITHUB_TOKEN';

let token;
try {
  token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
} catch (e) {
  console.error('Не удалось получить токен из gh. Запустите `gh auth login`.');
  process.exit(1);
}

const line = `${KEY}=${token}`;
let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';

if (new RegExp(`^${KEY}=.*$`, 'm').test(content)) {
  content = content.replace(new RegExp(`^${KEY}=.*$`, 'm'), line);
} else {
  if (content.length && !content.endsWith('\n')) content += '\n';
  content += line + '\n';
}

writeFileSync(ENV_PATH, content);
console.log(`✓ ${KEY} обновлён в ${ENV_PATH}`);
