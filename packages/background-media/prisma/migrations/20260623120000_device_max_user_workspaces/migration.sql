-- STE v1: workspace slot quota snapshot on Device (from cabinet tariff at pair/sync).
ALTER TABLE "Device" ADD COLUMN "maxUserWorkspaces" INTEGER;
