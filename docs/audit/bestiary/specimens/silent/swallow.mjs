// specimen: silent — намеренный пример для бестиария; не прод-код.
// Детектор обязан поймать пустой catch ниже (не объявленный молчок).



function bestiarySpecimenSilentSwallow() {
  try {
    throw new Error('boom');
  } catch {}
}
