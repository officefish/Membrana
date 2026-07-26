// specimen: stub — намеренный пример для бестиария; не прод-код.
// Обязательные поля заполнены ради прохождения зуба: формально не пусто, фактически
// пусто, и такое значение попадает в агрегаты как настоящее (вещдок #1219: leadPersona
// проверяется только на непустоту — 751 карточка из 971 заполнена, сколько из них
// затычки, узнать нечем).

export const card = {
  id: 'specimen-stub-card',
  leadPersona: 'TBD',
  whyNoncritical: '—',
  owner: 'уточнить позже',
  acceptance: 'n/a',
};

// Честное «нет» заглушкой НЕ является — детектор обязан пройти мимо:
export const honest = {
  id: 'specimen-stub-honest',
  buildStatus: 'declared-not-built',
  leadPersona: null,
};
