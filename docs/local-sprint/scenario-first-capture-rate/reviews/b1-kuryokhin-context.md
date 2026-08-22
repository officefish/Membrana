# b1 context — kuryokhin

Read #2046 and the live symptom before code: the first scenario recording after start writes 44100 Hz, while later chunks are 48000 Hz. The defect is not in `LiveSampler.start` ordering: the #2042 guard there runs before source/analyser/loop. The live track path is `ScenarioMicJournalBridge.recordChunk()` -> `startClipRecorder(stream, 'wav')` -> `startWavRecorder()`, where actual `ctx.sampleRate` was only read in `stop()` after PCM had already been accepted.
