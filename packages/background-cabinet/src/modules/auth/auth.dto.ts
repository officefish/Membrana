export interface LoginDto {
  login: string;
  password: string;
}

/**
 * Регистрация по коду приглашения (решение M3, сессия C): поле `code` обязательно.
 * Нормализация (`trim`, длина ≤ 128) — в сервисе. Это код панели офиса,
 * не тарифный промокод кабинета — не смешивать.
 */
export interface RegisterDto {
  login: string;
  password: string;
  code: string;
}
