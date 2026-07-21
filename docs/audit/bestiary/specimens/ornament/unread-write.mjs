// specimen: ornament — намеренный пример для бестиария; не прод-код.
// Пишет артефакт, который никто не читает (orphan-ruleset).

import { writeFileSync } from 'node:fs';

function bestiarySpecimenOrnamentUnreadWrite() {
  writeFileSync('docs/NEVER_READ_BESTIARY_ORNAMENT_SPECIMEN.md', 'ornament');
}
