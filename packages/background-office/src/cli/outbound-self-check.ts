/**
 * CLI: yarn office:self-check / yarn workspace @membrana/background-office self-check
 * Intern T1 (#195) — сетевой пинг без ключей.
 */
import {
  formatOutboundSelfCheckTable,
  runOutboundSelfCheck,
} from '../lib/outbound-self-check';

async function main(): Promise<void> {
  const results = await runOutboundSelfCheck();
  console.log('office outbound self-check (no API keys; network reachability only)');
  console.log(formatOutboundSelfCheckTable(results));
  const down = results.filter((r) => !r.reachable);
  if (down.length > 0) {
    console.log(`\n${down.length}/${results.length} unreachable (marked; exit 0 — diagnostics)`);
  } else {
    console.log(`\n${results.length}/${results.length} reachable`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
