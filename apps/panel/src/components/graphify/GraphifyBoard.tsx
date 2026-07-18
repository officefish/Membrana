/**
 * Раздел «Граф кода» (GRP1) — окно в блок-артефакт graphify через маршрут-мост
 * `/panel/section/graphify/*`. Панель НЕ импортирует исходники graphify
 * (консилиум: без прямых импортов panel↔блоки) — только iframe на мост, который
 * office гейтит по owner-cookie. Presentation блока сменный, здесь лишь рамка.
 */
export function GraphifyBoard() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-base-content/70">
        Function-level граф зависимостей по семействам проекта. Рендер — сырое
        D3-дерево (визуал не окончательный), генерируется code-only без ИИ.
        Доступ — только владелец.
      </p>
      <iframe
        title="Граф кода Membrana (по семействам)"
        src="/panel/section/graphify/"
        className="w-full rounded-lg border border-base-content/10 bg-base-100"
        style={{ height: '78vh' }}
      />
    </div>
  );
}
