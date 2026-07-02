# @membrana/audio-data-viz

Переиспользуемые React-компоненты визуализации аудио-данных (осциллограммы, спектр,
FFT-индексы), используемые клиентом прибора.

## Tailwind Integration

Пакет экспортирует React-компоненты с Tailwind/daisyUI-классами, но **не поставляет
собственный CSS-дистрибутив** (headless). Хост-приложение обязано сканировать `src/`
этого пакета в своём `tailwind.config` `content`
(см. `docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md`).

<!-- tailwind-content: ["./src/**/*.{ts,tsx}"] -->
