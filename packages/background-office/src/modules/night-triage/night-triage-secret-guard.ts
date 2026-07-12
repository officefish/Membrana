/**
 * Night Triage — секрет-гейт (NT4).
 *
 * Блокирующая проверка ПЕРЕД записью/push отчёта: если в выходном тексте есть
 * похожее на ключ/токен — ран прерывается (инвариант консилиума). Зеркалит
 * паттерны `scripts/night-triage-secret-scan.mjs`, но как чистая функция —
 * применяется к финальному контенту отчёта, а не к файлам.
 */

interface SecretPattern {
  readonly name: string;
  readonly re: RegExp;
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  { name: 'anthropic-key', re: /sk-ant-[a-zA-Z0-9_-]{10,}/u },
  { name: 'openai-key', re: /sk-[a-zA-Z0-9]{20,}/u },
  { name: 'github-token', re: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{20,}/u },
  { name: 'github-pat', re: /github_pat_[a-zA-Z0-9_]{20,}/u },
  { name: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/u },
  { name: 'slack-token', re: /xox[baprs]-[a-zA-Z0-9-]{10,}/u },
  { name: 'google-api-key', re: /AIza[0-9A-Za-z_-]{30,}/u },
  { name: 'private-key-pem', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'bearer-token', re: /Bearer\s+[a-zA-Z0-9_.~+/-]{20,}=*/u },
  { name: 'basic-auth-url', re: /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/iu },
];

/** Возвращает имена сработавших паттернов (пусто = чисто). */
export function findSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
}
