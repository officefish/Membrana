# Повестка M6′ — заседание server-plugin-foundation (переигрывание по вердикту аудита)

**Q6′ — Какова первая волна плагинов и что есть приёмка основы с первым живым плагином — при контрактах, данных ПОИМЁННО в посылках ниже?**

Единственный вопрос комнаты — финал DAG; переигрывание по аудиту 17.08 (прежний M6
унаследовал ложные посылки из старых M3/M5 — находки A6-1…A6-7). Контракты НЕ
переоткрываются; всё несущее — поимённо здесь.

Что комната обязана решить (грани одного вопроса):

- Состав первой волны: шесть детекторов (harmonic, cepstral, spectral-flux,
  template-match, yamnet, mfcc) — плагины рода `handler` дома
  `background-media/collections`; их манифесты — `HandlerManifest` (НЕ ShowcaseManifest:
  у handler витринных полей физически нет — вердикт M5′). Все шесть сразу или порядок.
  Витринный плагин: включать ли в волну — решить честно; заметь, что контракты M1/M5′
  витринный род ПРЕДУСМОТРЕЛИ (`kind: 'showcase'`, ShowcaseManifest готов) — «требует
  переоткрытия M1» ложно (находка A6-6), обоснование границы давать настоящее.
- Первый живой плагин (Т3.11): прежний выбор — mfcc за детерминизм и чистоту; id по
  формату M1 — `membrana.handler.mfcc` (НЕ «mfcc-detector»: не проходит regex).
  Переподтвердить или изменить.
- Живой след ЧЕСТНОЙ формы (закрытие A6-3/A6-4/A6-5): документ RunRecord в
  `plugin-results` с адресом `RunAddress = { pluginId, version, collectionId, runId,
  mountTarget }` (вердикт M3′) И отпечатками `RunFingerprints = { inputHash, configHash }`
  (отдельный интерфейс, не часть адреса) И полем `resumeMode: 'fresh'` (первый прогон);
  `StateRecord` — жилец НАКОПИТЕЛЬНОГО плагина, у одиночного постфактум-прогона его НЕТ;
  `ConvergenceRecord` требует пары live/recompute — у одиночного прогона пары НЕТ.
  Решить: что именно входит в предъявление первого живого следа, не требуя артефактов,
  которых у детерминированного постфактум-прогона быть не может.
- Приёмочный список: пересобрать PR-план на честных контрактах (PR-5 прежнего вердикта
  невыполним — требовал ShowcaseManifest у шести handler); вернуть в приёмку норму
  «результаты плагинов не подменяют измеренное сервером» (#1950 — НОРМА, не номер PR;
  находка A6-7).
- Границы «не делаем»: прежние девять переподтвердить/поправить (граница про витринный
  плагин — с настоящим обоснованием).

Посылки комнаты (даны, не обсуждаются — все ПОИМЁННО):
M1_VERDICT.md: манифест ровно пять полей id · version · kind · mountTarget · triggers;
PluginId `<org>.<kind>.<slug>` regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$`;
включённость — операции реестра; расширения — HandlerManifest/ReportManifest/ShowcaseManifest;
PluginExecutor.execute(ctx) → RunResult { completedAt, kind }.
M2_VERDICT.md: дома background-office/journal и background-media/collections; IPluginHost
(mountTargetId, registerPlugin, getRegisteredPlugins); HOME_REGISTRY; mountTarget: HomeName.
M3 (непереигранная часть) + M3′: RunAddress пять полей с mountTarget: HomeName;
RunFingerprints { inputHash, configHash } отдельным интерфейсом; StateRecord — заморозка
накопительного, windowStart/windowEnd; resumeMode — поле RunRecord со значениями
'from-freeze' | 'fresh'; windowSize — в HandlerManifest; ConvergenceRecord { liveRunId,
recomputeRunId, ... }; носитель — Mongo офиса, коллекция plugin-results, уникальный
индекс { pluginId, version, collectionId, runId }.
M4_VERDICT.md (с эрратумом): PLUGIN_TRIGGERS закрыт (journal.entry_created,
collections.collection_created, collections.sample_added); каналы notify/request;
fire-and-forget; догонялка — чтение дома результатов по RunAddress; request(pluginId:
PluginId, ...).
M5′ (протокол server-plugin-foundation-m5r-showcase-2026-08-17.md): ShowcaseManifest =
база + displayForm: DisplayForm + description?; DisplayForm закрытый (row | table |
zone-map | histogram | time-series | x-${string} с обязательным fallback); чтение —
getRegisteredPlugins с narrowing; включение — setPluginEnabled(id: PluginId, enabled);
у HandlerManifest/ReportManifest витринных полей нет.
Т3.5 шторма (шесть детекторов — норма); Т3.11 (основа сдаётся с первым живым — норма);
Т2 (пример владельца: сортировка по громкости / пиковые зоны — факт).
Факты репозитория: шесть детекторов — пакеты packages/services/* с зубами; на media
живёт устройство field-node-2026-08 и коллекция «Полевые записи 2026-08» с пробами тракта.
MEETING_BRIEF.md: норма #1950 — результаты плагинов не подменяют измеренное сервером;
код — только после вердиктов.

Требование к вердикту: назвать состав волны, первый живой плагин с id по формату M1,
честную форму живого следа, приёмочный PR-план и границы «не делаем» с обоснованием
против альтернатив И полный список посылок вердикта (факт/норма) в том же прогоне.
Список посылок обязателен; лишняя посылка — тоже нарушение. Контракты M1/M2/M3′/M4/M5′
не переоткрывать; нарезку задач и код не производить.
