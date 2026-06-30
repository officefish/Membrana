/**
 * Regex-паттерны для скруба секретов из AI-сессий перед архивацией.
 *
 * Применяются до дедупликации: хеш turn'а вычисляется по уже скрубленному тексту.
 * Порядок имеет значение — специфические паттерны идут раньше общего high-entropy.
 */
export const SECRET_PATTERNS: readonly RegExp[] = [
  // Anthropic API ключи: sk-ant-api03-... (длинные цепочки)
  /sk-ant-[A-Za-z0-9_\-]{20,}/g,
  // GitHub Personal Access Tokens (classic и fine-grained)
  /ghp_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
  // Linear API ключи
  /lin_api_[A-Za-z0-9]{40}/g,
  // Generic Bearer-токены в заголовках (Authorization: Bearer ...)
  /Bearer\s+[A-Za-z0-9\-._~+/]{20,}={0,2}/g,
  // High-entropy значения после = или : (пары ключ=значение в env/config)
  // Минимум 20 символов из base64 / hex алфавита
  /(?<=[=:]\s*)[A-Za-z0-9+/]{20,}={0,2}(?=\s|$|["'])/g,
] as const;

/** Заменитель, подставляемый вместо скрубленного секрета. */
export const SECRET_REDACTION_PLACEHOLDER = '[REDACTED]';
