# b3 context — kuryokhin

The failing path is WAV scenario capture, not MFCC analysis. `startWavRecorder` created `AudioContext({ sampleRate: 48000 })`, connected the stream/worklet, collected chunks, and only encoded with `ctx.sampleRate` at stop time. That lets the first post-start 44100 context produce a short WAV before any refusal can happen.
