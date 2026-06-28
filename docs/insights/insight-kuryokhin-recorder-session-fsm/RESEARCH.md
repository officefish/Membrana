# Research: Recorder session FSM

## Q1 — Landscape

Audio pipelines use explicit state machines (GStreamer, Web Audio session graphs) to prevent orphan recorders.

## Q2 — Fit

audio-engine foundation layer; device-board stays thin host.

## Q3 — Risk

Migration churn — incremental: FSM wraps existing bridge, tests lock behavior.

*Источник: project fit*
