/* eslint-env node */
/**
 * Граница импортов executor'а mfcc — правилом линтера, а не regex-зубом (#1972 п.3, спринт
 * contour-sanity 19.08). Норма #1950 держится формой: у плагина нет канала к пробам, кроме
 * порта `CollectionSampleReader`, и линтер не даёт этому каналу появиться — ни Prisma, ни Nest,
 * ни файловой системе, ни сети. Запрет именами, не «разрешённым списком»: новый честный
 * импорт (ядро, контракты, соседний файл пакета) не должен ронять линт.
 */
const FORBIDDEN_IN_EXECUTOR = [
  { group: ['@prisma/*', '.prisma/*'], message: 'executor не ходит в БД — пробы только через CollectionSampleReader (#1950)' },
  { group: ['@nestjs/*'], message: 'пакет плагинов framework-нейтрален: Nest живёт в хостах, не здесь' },
  { group: ['node:fs', 'node:fs/*', 'fs', 'fs/*'], message: 'executor не читает диск сам — байты проб приносит порт' },
  { group: ['node:http', 'node:https', 'node:net', 'node:child_process', 'http', 'https', 'net', 'child_process', 'undici'], message: 'executor не ходит в сеть и процессы — это работа хоста/скрипта' },
  { group: ['mongodb', '@membrana/background-*'], message: 'дом результатов и сервисы — по ту сторону хоста; плагин их не знает' },
];

module.exports = {
  overrides: [
    {
      files: ['src/mfcc/executor.ts', 'src/mfcc/preset.ts', 'src/sample-reader.ts', 'src/wav.ts', 'src/first-wave.ts', 'src/stubs.ts'],
      rules: {
        'no-restricted-imports': ['error', { patterns: FORBIDDEN_IN_EXECUTOR }],
      },
    },
  ],
};
