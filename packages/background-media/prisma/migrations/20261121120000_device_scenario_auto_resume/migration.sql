-- ADR-0033 Р1: копия признака «возобновлять сценарий при старте» у прибора; origin — кабинет,
-- разносится тем же PATCH `/membrane`, что квоты и политика. Умолчание ВЫКЛ для всех приборов.
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "scenarioAutoResume" BOOLEAN NOT NULL DEFAULT false;
