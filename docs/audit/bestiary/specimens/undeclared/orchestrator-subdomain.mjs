// specimen: undeclared — намеренный пример для бестиария; не прод-код.
// Живой адрес контура в коде, о котором канон не знает: детектор обязан дать finding
// при declarationsOf === 0 (вещдок #1221: оркестратор процедур на поддомене, сутки
// работы ушли на постройку рядом с уже стоящим оркестратором).

const ORCHESTRATOR = 'https://procedures.mmbrn.tech/webhook/run';

export async function bestiarySpecimenUndeclaredOrchestrator(payload) {
  const res = await fetch(ORCHESTRATOR, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.ok;
}
