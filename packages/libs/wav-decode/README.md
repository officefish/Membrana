# @membrana/wav-decode

WAV PCM16 → моно `Float32Array`. Одна реализация на трёх потребителей — `@membrana/plugin-handlers`
(`wav.ts` реэкспортирует), `background-media` (`decode-wav-mono.ts` оборачивает в бросок),
`scripts/lib/wav-read.mjs` (читает файл, декодирует здесь). До 19.08 копий было три (#1972).

Собран **CommonJS** нарочно: `background-media` — CJS на Node 20 и зовёт декодер синхронно;
ESM-пакеты и `.mjs`-скрипты импортируют CJS без потерь. Вход — `Uint8Array` (Buffer подходит),
выход — `{ ok: true, audio }` либо `{ ok: false, reason }`; бросков нет, решение «бросать или нет» —
у потребителя.
