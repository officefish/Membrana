#!/usr/bin/env node
/**
 * DR3 (deploy-pipeline-refactor): откат cabinet = деплой предыдущего тега образа.
 *
 * Откат — это обычный image-деплой по тегу известного-хорошего релиза. Образ уже собран
 * в CI и иммутабелен, поэтому CI-гейт обходится автоматически (DEPLOY_ALLOW_RED_CI),
 * но preflight (чистое дерево) сохраняется. JSON-сводка пишется с kind=rollback.
 *
 * Использование:
 *   CABINET_ROLLBACK_TAG=cabinet-v1.0.0 yarn cabinet:rollback:prod
 *   # без тега — печатает список доступных релизных тегов и выходит с кодом 2.
 *
 * Env: см. _ssh-cabinet-deploy-image.mjs (BACKGROUND_MEDIA_IPV4/PASSWORD, CABINET_*_IMAGE).
 */
import { execSync } from 'node:child_process';
import {
  root,
  readEnvFile,
  deployCabinetImage,
  writeDeploySummary,
} from './_ssh-cabinet-deploy-image.mjs';

function listReleaseTags() {
  try {
    const out = execSync("git tag --list 'cabinet-v*' --sort=-creatordate", {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      timeout: 20000,
    });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const get = readEnvFile();
  const branch =
    process.env.CABINET_GIT_BRANCH || get('CABINET_GIT_BRANCH') || get('GIT_BRANCH') || 'main';
  const target = process.env.CABINET_ROLLBACK_TAG || process.env.CABINET_IMAGE_TAG || '';
  const apiImage = process.env.CABINET_API_IMAGE || get('CABINET_API_IMAGE') || '';
  const webImage = process.env.CABINET_WEB_IMAGE || get('CABINET_WEB_IMAGE') || '';
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');

  if (!target) {
    const tags = listReleaseTags();
    console.error('Откат: укажи тег через CABINET_ROLLBACK_TAG=<tag>.');
    console.error('Доступные релизные теги (свежие сверху):');
    if (tags.length === 0) console.error('  (релизных тегов cabinet-v* не найдено)');
    for (const t of tags.slice(0, 20)) console.error(`  ${t}`);
    process.exit(2);
  }

  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
    process.exit(1);
  }

  console.log(`ROLLBACK cabinet → tag=${target} (CI-гейт обойдён: образ уже собран)`);
  const summary = await deployCabinetImage({
    imageTag: target,
    branch,
    apiImage,
    webImage,
    host,
    password,
    // Образ известно-хороший и иммутабельный — не блокируемся на статусе CI ветки.
    allowRedCi: true,
  });
  summary.kind = 'rollback';
  const file = writeDeploySummary(summary, { kind: 'rollback' });
  console.log(`\n=== rollback summary (${file}) ===`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

main();
