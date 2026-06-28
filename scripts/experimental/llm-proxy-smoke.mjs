/**
 * Smoke-обёртка: добавляет --smoke перед аргументами CLI.
 * yarn llm-proxy:smoke --freemodel-dev --haiku-4-5
 */
process.argv.splice(2, 0, '--smoke');
await import('./llm-proxy-ask.mjs');
