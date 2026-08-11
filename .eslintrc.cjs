/* eslint-env node */
/**
 * Единая конфигурация ESLint для монорепо (apps/*, packages/*).
 * Запуск: `yarn turbo run lint` или `yarn workspace @membrana/client lint`.
 */
/**
 * TD3 (tech-debt-2026-07): статический гейт против дубля singleton-мостов
 * клиент↔сервер (аудит §3.5 DEVICE_BOARD_SERVER_FIRST). Запрещаем `new X` для
 * мостов, у которых есть канонический getter — провайдер/компонент, создающий
 * СВОЙ инстанс вместо общего, был корнем CSR1 («кнопки не влияют») и PCB
 * (persistent-offline). Фабрики этих мостов исключены ниже (единственная точка `new`).
 *
 * Вектор 2 §3.5 (идемпотентность connect()/start()) семантический — ESLint его не
 * проверяет; остаётся инвариантом code-review (§3.5).
 */
const noSingletonBridgeNew = [
  'error',
  {
    selector: 'NewExpression[callee.name="DeviceBoardRuntimeController"]',
    message:
      'Не создавайте свой DeviceBoardRuntimeController — используйте getDeviceBoardRuntimeController() (единый runtime-мост, §3.5; корень CSR1).',
  },
  {
    selector: 'NewExpression[callee.name="NodeRealtimeClientImpl"]',
    message:
      'Не создавайте свой NodeRealtimeClientImpl — используйте getNodeRealtimeClient() (единый WS-транспорт, §3.5; корень PCB persistent-offline).',
  },
];

module.exports = {
  root: true,
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/build/**',
    '**/coverage/**',
    '.yarn/**',
    '**/.turbo/**',
    '**/*.min.js',
  ],
  overrides: [
    {
      files: ['**/*.{ts,mts,cts}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
        'no-restricted-syntax': noSingletonBridgeNew,
      },
    },
    {
      files: ['**/*.{tsx,jsx}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      settings: { react: { version: 'detect' } },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
        'no-restricted-syntax': noSingletonBridgeNew,
      },
    },
    {
      // Фабрики singleton-мостов — единственная разрешённая точка `new` (§3.5).
      files: ['**/lib/deviceBoardRuntimeController.ts', '**/lib/nodeRealtimeClient.ts'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      // Агентский тулинг: ESM-скрипты (#1264). До этого override любой
      // `scripts/*.mjs` падал парсером («The keyword 'import' is reserved») —
      // самая правимая часть репозитория не линтилась вообще.
      files: ['scripts/**/*.mjs'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      env: { node: true, es2024: true },
      extends: ['eslint:recommended'],
      // Порог #1264: замер 2026-08-11 дал 133 находки в 66 файлах из 1105.
      // Шесть накопивших долг правил переведены в warn (НЕ off: шум виден в
      // каждом прогоне), рост запрещён храповиком `lint:scripts`
      // (--max-warnings). Остальной recommended — error: чистые сегодня классы
      // заперты. Долг гасится в #1264: warn → 0 → вернуть в error.
      rules: {
        // Та же конвенция, что в TS-оверрайдах выше: `_`-префикс — осознанно неиспользуемое.
        'no-unused-vars': [
          'warn', // 63
          { argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' },
        ],
        'no-useless-escape': 'warn', // 55
        'no-irregular-whitespace': 'warn', // 6
        'no-regex-spaces': 'warn', // 5
        'no-constant-condition': 'warn', // 2
        'no-control-regex': 'warn', // 2
      },
    },
  ],
};
