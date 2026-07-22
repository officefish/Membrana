// specimen: echo — намеренный пример эхо-камеры; не прод-код.
// Три отражения одного origin читаются как «консенсус» без дедупа по origin-hash
// (живой случай 16.07: detection-planning-priorities@06.07 ×3).

function bestiarySpecimenEchoTripleReflection() {
  const sources = [
    { claim: 'S2 первый', origin: 'detection-planning-priorities.mjs@2026-07-06' },
    { claim: 'форсайт S2', origin: 'detection-planning-priorities.mjs@2026-07-06' },
    { claim: 'standup S2', origin: 'detection-planning-priorities.mjs@2026-07-06' },
  ];
  // BAD: .length как число независимых источников (эхо = n=1, не 3).
  return sources.length;
}
