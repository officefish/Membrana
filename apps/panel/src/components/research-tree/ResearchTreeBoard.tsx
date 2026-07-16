/**
 * Раздел «Древо исследований» (GRP3) — окно в блок-артефакт research-tree через
 * маршрут-мост `/panel/section/research-tree/*`. Панель НЕ импортирует исходники
 * блока (консилиум: без прямых импортов panel↔блоки) — только iframe на мост,
 * который office гейтит по grant:research-tree. Presentation блока сменный
 * (инвариант «живой мозг» — будущий дизайн-эпик), здесь лишь рамка.
 */
export function ResearchTreeBoard() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/70">
        Карта знаний проекта: направления, гейты и прогресс, с перемоткой во
        времени (генезис → сейчас). Данные — офлайн-снапшот, не живой git. Рендер
        промежуточный (визуал не окончательный).
      </p>
      <iframe
        title="Древо исследований Membrana"
        src="/panel/section/research-tree/"
        className="w-full rounded-lg border border-base-content/10 bg-base-100"
        style={{ height: '80vh' }}
      />
    </div>
  );
}
