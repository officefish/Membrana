-- #2611 К1 (2/3): снять подставку "Tariff" из `20260612110000_tariff_bootstrap_empty_db` до того,
-- как `20260614120000_mp2_domain` создаст настоящую таблицу. Сносится ТОЛЬКО таблица с меткой
-- 'membrana-2611-bootstrap': настоящий "Tariff" (прод, любой стенд с данными) метки не несёт —
-- там миграция ничего не делает.
DO $$
BEGIN
  IF obj_description(to_regclass('"Tariff"'), 'pg_class') = 'membrana-2611-bootstrap' THEN
    DROP TABLE "Tariff";
  END IF;
END $$;
