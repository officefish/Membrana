interface Props {
  readonly isDrone: boolean;
  readonly isRunning: boolean;
  readonly compact?: boolean;
}

export function DetectionStatus({ isDrone, isRunning, compact = false }: Props) {
  if (!isRunning) {
    return (
      <div className={`alert py-3 ${compact ? 'min-h-[3.5rem]' : 'min-h-[4.5rem]'}`}>
        <span className="text-base-content/70">Микрофон выключен — запустите поток</span>
      </div>
    );
  }

  const alertClass = isDrone ? 'alert alert-success' : 'alert';

  return (
    <div
      className={`${alertClass} py-3 transition-all duration-500 ease-in-out ${
        compact ? 'min-h-[3.5rem]' : 'min-h-[4.5rem]'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-0.5">
        <span
          className={`font-semibold transition-opacity duration-500 ${
            compact ? 'text-lg' : 'text-2xl'
          }`}
        >
          {isDrone ? 'Дрон обнаружен' : 'Дрон не обнаружен'}
        </span>
        <span className="text-xs text-base-content/60">
          {isDrone ? 'Мультироторный сигнал' : 'Чисто / нет сигнала'}
        </span>
      </div>
    </div>
  );
}
