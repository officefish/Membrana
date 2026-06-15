# @membrana/trends-detector-service

Классификация акустических сцен по серии FFT-метрик (centroid, flux, RMS) с весами **70% temporal / 30% spectral**.

## API

- `computeTemporalFeatures(samples)` — временные паттерны окна
- `scoreTemplate(features, template, samples)` — оценка одного шаблона
- `classifyTrends(samples, templates, options?)` — лучший класс + confidence
- `SYSTEM_TEMPLATES` — системные шаблоны (WIND, QUIET, TRAFFIC, DRONE, BIRDS, VOICE)

Pure TypeScript, без React/DOM/Web Audio.
