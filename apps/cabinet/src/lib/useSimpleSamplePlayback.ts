import { useCallback, useEffect, useRef, useState } from 'react';

export type SamplePlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface UseSimpleSamplePlaybackResult {
  selectedSampleId: string | null;
  status: SamplePlaybackStatus;
  error: string | null;
  toggleSample: (sampleId: string) => Promise<void>;
  stop: () => void;
}

export function useSimpleSamplePlayback(
  getBlob: ((sampleId: string) => Promise<Blob>) | null,
): UseSimpleSamplePlaybackResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [status, setStatus] = useState<SamplePlaybackStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    revokeObjectUrl();
    setSelectedSampleId(null);
    setStatus('idle');
    setError(null);
  }, [revokeObjectUrl]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  const toggleSample = useCallback(
    async (sampleId: string) => {
      if (!getBlob) {
        setError('Воспроизведение недоступно');
        setStatus('error');
        return;
      }

      if (selectedSampleId === sampleId && status === 'playing') {
        stop();
        return;
      }

      setError(null);
      setStatus('loading');
      setSelectedSampleId(sampleId);

      try {
        const blob = await getBlob(sampleId);
        revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.addEventListener('ended', () => {
            setStatus('idle');
          });
        }

        audioRef.current.src = url;
        await audioRef.current.play();
        setStatus('playing');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    },
    [getBlob, revokeObjectUrl, selectedSampleId, status, stop],
  );

  return {
    selectedSampleId,
    status,
    error,
    toggleSample,
    stop,
  };
}
