# a3 · Дынин · detector runner

**Предмет:** последовательный read-only прогон живого detector orchestrator по N пробам.

Executor сначала замораживает fingerprint набора, затем читает WAV и вызывает внедрённый
анализатор. Ошибка одной пробы остаётся в её строке и не роняет остальные; NaN/Infinity и
неразбираемый WAV получают именованный исход. Записывающего порта у executor нет.

**Evidence:** executor tests 7/7; registrar/controller tests 22/22; полный typecheck
`background-media`; регистрация использует существующий `analyzeDroneDetectionDetailed`.

**Gap:** прогон последовательный и синхронный относительно HTTP-запроса. Фоновая очередь и
прогресс по пробам не входят в принятый verdict и требуют отдельного продуктового решения.
