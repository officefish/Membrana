# @membrana/plugin-handlers

Handler-плагины первой волны серверной плагинности (эпик #1961, план M6′): шесть детекторов
дома `background-media/collections`, род `handler`, повод `collections.sample_added`.

- **`membrana.handler.mfcc`** — первый живой: executor поверх `@membrana/mfcc-analyzer-service`
  (свёртка `processWindow`, суд `evaluatePipe` по воротам калибровки `data/detectors-benchmark/v0.2/reports/mfcc-gates-first-cut.json`).
- harmonic · cepstral · spectral-flux · template-match · yamnet — манифест настоящий, executor
  отвечает именованным отказом `PluginNotImplementedError` (не молчит).

Норма #1950 держится формой: единственный вход в дом — порт `CollectionSampleReader` из двух
читающих членов; write-путей в `samples`/`collections` у пакета нет (зуб по импортам).

Живой прогон на настоящей коллекции: `yarn plugin:run:mfcc --device <uuid> --collection <uuid>`
(читатель — GET'ы медиа-сервиса, считалка — `meyda` из корня; хост — после PR-2).
