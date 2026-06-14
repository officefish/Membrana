# Промпт: Media Library A2 — UI модуль и quota banner

> **Task:** `media-library-a2-ui` · фаза **A2** · размер **M**  
> Зависит от: `media-library-a1-storage`

---

## Цель

Модуль клиента «Библиотека сэмплов»: коллекции buffer/system/user, import WAV, move из буфера, banner ограничений при fallback.

## DoD

- [x] `SampleLibraryModule` зарегистрирован в `registerClientModules`
- [x] `MediaLibraryQuotaBanner` при `browser-limited-fallback`
- [x] Vite alias `@membrana/media-library-service`
- [x] Ручной smoke: import → buffer → move → system collection

## Out of scope

- Запись с микрофона (A3)
