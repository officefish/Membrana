/**
 * Зуб #2147/№5: какие turbo-замыкания обязана собрать упаковка Studio ДО studio:build.
 *
 * Вещдок Г 25.08 (после #2159): studio:package упал на studio:build — `yarn workspace
 * @membrana/client build` красный из-за dist @membrana/telemetry-journal-service,
 * протухшего ПО СОДЕРЖИМОМУ при свежей дате. Замыкание `@membrana/membrana-studio...`
 * этот пакет не покрывало: studio:build собирает apps/client (scripts/studio-build.mjs),
 * а telemetry-journal-service — зависимость КЛИЕНТА, не манифеста Studio. Значит
 * замыканий два, и клиентское — обязательное (в issue #2147 так и было названо:
 * `--filter=@membrana/client...`; взять своё вместо названного было ошибкой).
 * turbo хеширует входы по содержимому — попавший в замыкание пакет пересобирается.
 */
export const DEPS_BUILD_FILTERS = ['@membrana/client...', '@membrana/membrana-studio...'];

/** Аргументы turbo для шага дередов. */
export function depsBuildArgs(filters = DEPS_BUILD_FILTERS) {
  return ['turbo', 'run', 'build', ...filters.map((f) => `--filter=${f}`)];
}
