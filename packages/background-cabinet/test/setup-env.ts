import 'reflect-metadata';

// Обязательные env кабинета для тестов (env.schema): без них AppConfigModule
// валит сборку графа ещё до DI. Значения фиктивные; сеть/база не трогаются —
// compile() хуков onModuleInit не зовёт (образец: background-office/test/setup-env.ts).
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.API_INTERNAL_TOKEN = process.env.API_INTERNAL_TOKEN ?? 'test-internal-token';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
