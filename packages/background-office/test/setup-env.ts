import 'reflect-metadata';

// НОРМА (консилиум agent-tooling-friction 2026-07-13, ti-3): тестовое окружение
// НЕ наследует прокси из шелла — undici ProxyAgent читает эти переменные В ОБХОД
// мока global.fetch, и e2e ложно краснеют у любого, кто сидит за прокси.
// Прокси-зависимый тест объявляет env ЛОКАЛЬНО (vi.stubEnv) и снимает в afterEach.
for (const name of ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy']) {
  delete process.env[name];
}

process.env.NODE_ENV = 'test';
process.env.PORT = '3100';
process.env.LOG_LEVEL = 'error';
process.env.API_INTERNAL_TOKEN = 'test-internal-token';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.LINEAR_API_KEY = 'test-linear-key';
process.env.LINEAR_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.GITHUB_OWNER = 'officefish';
process.env.GITHUB_REPO = 'Membrana';
process.env.PANEL_SESSION_SECRET = 'test-panel-session-secret';
