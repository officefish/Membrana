import React from 'react';

export interface MicrophoneCapturePanelProps {
  deviceSelectId: string;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  loadingDevices: boolean;
  isLive: boolean;
  error: string | null;
  trackLabel: string | null;
  permissionDenied: boolean;
  onSelectDevice: (deviceId: string) => void;
  onToggleStream: () => void;
  onRefreshDevices: () => void;
}

function MicrophoneIcon({ live }: { live: boolean }) {
  return (
    <span
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ease-out ${
        live
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-base-300 bg-base-200/80 text-base-content/50'
      }`}
      aria-hidden
    >
      {live && (
        <span className="absolute inset-0 animate-ping rounded-full border border-primary/40 opacity-40" />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="relative h-7 w-7"
      >
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
        <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 19 11Z" />
      </svg>
    </span>
  );
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0-1.062-.852l-2.106 2.107a.75.75 0 0 0-1.061 1.06l2.106-2.107a.75.75 0 0 0 1.063.002ZM4.657 8.576a7 7 0 0 0 11.713 3.138.75.75 0 0 0 1.448-.39 5.5 5.5 0 0 1-9.2-2.466l-.31.31h2.432a.75.75 0 0 0 0-1.5H3.984a.75.75 0 0 0-.75.75v4.243a.75.75 0 0 0 1.5 0v-2.43l.923-.923Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CaptureHero({
  isLive,
  trackLabel,
  showInvite,
}: {
  isLive: boolean;
  trackLabel: string | null;
  showInvite: boolean;
}) {
  return (
    <div className="flex gap-4 items-start">
      <MicrophoneIcon live={isLive} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-base-content">
          {isLive ? 'Слушаем' : 'Микрофон выключен'}
        </p>
        <p className="text-sm text-base-content/60 mt-1">
          {isLive
            ? 'Поток доступен всем плагинам модуля'
            : 'Выберите устройство и начните прослушивание'}
        </p>
        {trackLabel && isLive && (
          <p
            className="text-sm text-base-content/80 mt-2 truncate tabular-nums"
            title={trackLabel}
          >
            {trackLabel}
          </p>
        )}
        {showInvite && (
          <p className="text-sm text-info mt-2">
            Список устройств появится после разрешения микрофона — нажмите «Начать
            прослушивание».
          </p>
        )}
      </div>
    </div>
  );
}

function PermissionHint() {
  return (
    <div className="alert alert-warning mt-4 text-sm" role="alert">
      <div>
        <p className="font-medium">Доступ к микрофону запрещён</p>
        <p className="mt-1 opacity-90">
          Разрешите запись в настройках браузера (иконка замка в адресной строке), затем
          нажмите «Начать прослушивание» снова.
        </p>
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-error mt-4 text-sm" role="alert">
      <span>{message}</span>
    </div>
  );
}

function DeviceRow({
  deviceSelectId,
  devices,
  selectedDeviceId,
  loadingDevices,
  onSelectDevice,
  onRefreshDevices,
}: Pick<
  MicrophoneCapturePanelProps,
  | 'deviceSelectId'
  | 'devices'
  | 'selectedDeviceId'
  | 'loadingDevices'
  | 'onSelectDevice'
  | 'onRefreshDevices'
>) {
  return (
    <>
      <div className="label py-1">
        <span className="label-text font-medium">Какой микрофон слышит мир</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square min-h-8 min-w-8"
          onClick={onRefreshDevices}
          aria-label="Обновить список устройств"
          title="Обновить список устройств"
        >
          <RefreshIcon />
        </button>
      </div>
      <select
        id={deviceSelectId}
        className="select select-bordered w-full"
        disabled={loadingDevices}
        value={selectedDeviceId}
        onChange={(e) => onSelectDevice(e.target.value)}
      >
        {loadingDevices && <option value="">Загрузка…</option>}
        {!loadingDevices && <option value="">По умолчанию (система)</option>}
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Микрофон ${d.deviceId.slice(0, 8)}…`}
          </option>
        ))}
      </select>
    </>
  );
}

function DevDocs() {
  return (
    <div className="collapse-content text-xs text-base-content/70 pb-3">
      <p>
        Поток публикуется через{' '}
        <code className="text-primary">publishMicrophoneStream</code> /{' '}
        <code className="text-primary">subscribeMicrophoneStream</code> в{' '}
        <code className="text-xs">microphoneStreamHub.ts</code>. MediaStream — через{' '}
        <code className="text-xs">@membrana/audio-engine-service</code>.
      </p>
    </div>
  );
}

/**
 * Презентационный блок: выбор устройства и запуск/остановка потока.
 * Логика захвата — в MicrophoneModule + audio-engine-service.
 */
export const MicrophoneCapturePanel: React.FC<MicrophoneCapturePanelProps> = ({
  deviceSelectId,
  devices,
  selectedDeviceId,
  loadingDevices,
  isLive,
  error,
  trackLabel,
  permissionDenied,
  onSelectDevice,
  onToggleStream,
  onRefreshDevices,
}) => {
  const showInvite =
    !isLive && !loadingDevices && devices.length === 0 && !permissionDenied;

  return (
    <section
      className={`rounded-box border p-4 md:p-5 transition-colors duration-200 ease-out ${
        isLive
          ? 'border-primary/40 bg-primary/5'
          : 'border-base-300 bg-base-200/30'
      }`}
      aria-labelledby={`${deviceSelectId}-capture-heading`}
    >
      <p
        id={`${deviceSelectId}-capture-heading`}
        className="text-lg font-medium text-base-content mb-4"
      >
        Вход в акустику
      </p>

      <CaptureHero isLive={isLive} trackLabel={trackLabel} showInvite={showInvite} />

      {permissionDenied && <PermissionHint />}

      {error && !permissionDenied && <ErrorAlert message={error} />}

      <div className="form-control w-full mt-4">
        <DeviceRow
          deviceSelectId={deviceSelectId}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          loadingDevices={loadingDevices}
          onSelectDevice={onSelectDevice}
          onRefreshDevices={onRefreshDevices}
        />
      </div>

      <button
        type="button"
        className={`btn w-full min-h-12 mt-4 transition-colors duration-200 ease-out ${
          isLive ? 'btn-error' : 'btn-primary'
        }`}
        disabled={loadingDevices}
        onClick={onToggleStream}
        aria-pressed={isLive}
      >
        {isLive ? 'Остановить прослушивание' : 'Начать прослушивание'}
      </button>

      <details className="collapse collapse-arrow bg-base-200/40 border border-base-300 rounded-box mt-4">
        <summary className="collapse-title min-h-10 py-2 text-xs font-medium text-base-content/70">
          Как устроена публикация потока
        </summary>
        <DevDocs />
      </details>
    </section>
  );
};
