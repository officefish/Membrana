-- ADR-0033 Р1: признак «возобновлять сценарий доски при старте Студии» — на приборе, умолчание ВЫКЛ.
-- NOT NULL DEFAULT false: все существующие приборы получают ВЫКЛ (включает владелец осознанно).
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "scenarioAutoResume" BOOLEAN NOT NULL DEFAULT false;
