import { spawn } from 'node:child_process';

// РџРѕСЂС‚ Hiddify Mixed; РјРѕР¶РЅРѕ РїРµСЂРµРѕРїСЂРµРґРµР»РёС‚СЊ: HIDDIFY_PORT=2334 yarn proxy:claude
const port = process.env.HIDDIFY_PORT ?? '12334';
const proxy = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  HTTPS_PROXY: proxy,
  HTTP_PROXY: proxy,
};

// РџСЂРѕРєРёРґС‹РІР°РµРј Р»СЋР±С‹Рµ РґРѕРї. Р°СЂРіСѓРјРµРЅС‚С‹: yarn proxy:claude --resume Рё С‚.Рї.
const args = process.argv.slice(2);

const child = spawn('claude', args, {
  env,
  stdio: 'inherit', // РёРЅС‚РµСЂР°РєС‚РёРІРЅС‹Р№ TUI Claude Code СЂР°Р±РѕС‚Р°РµС‚ РєР°Рє РѕР±С‹С‡РЅРѕ
  shell: true, // РЅСѓР¶РЅРѕ, С‡С‚РѕР±С‹ Windows РЅР°С€С‘Р» claude.cmd
});

child.on('exit', (code) => process.exit(code ?? 0));
