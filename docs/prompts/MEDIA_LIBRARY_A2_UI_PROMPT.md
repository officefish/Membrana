# Промпт: Media Library A2 — UI модуль и quota banner

> **Task:** `media-library-a2-ui` · фаза **A2** · размер **M**  
> Зависит от: `media-library-a1-storage`

---

## Цель

Модуль клиента «Библиотека сэмплов»: коллекции buffer/system/user, import WAV, move из буфера, banner ограничений при fallback.

## DoD

- [ ] `SampleLibraryModule` зарегистрирован в `registerClientModules`
- [ ] `MediaLibraryQuotaBanner` при `browser-limited-fallback`
- [ ] Vite alias `@membrana/media-library-service`
- [ ] Ручной smoke: import → buffer → move → system collection

## Out of scope

- Запись с микрофона (A3)
