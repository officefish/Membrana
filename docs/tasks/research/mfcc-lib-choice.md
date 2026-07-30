# RESEARCH: Выбор MFCC-библиотеки: обоснование до нарезки блоков

> Сгенерировано `yarn research` (Perplexity API), 2026-07-30.
> Выжимка — вход для решения, а не решение: проверяй утверждения по нашему коду.
## Q1 — Landscape

**Запрос:** Which JavaScript/TypeScript libraries compute MFCC (mel-frequency cepstral coefficients) from audio and work both in the browser (Web Audio API) and in Node.js? Compare Meyda, essentia.js and any other maintained options as of 2025-2026 on: license, package size, whether they require WebAssembly, maintenance activity, and whether MFCC parameters (number of mel filters, number of coefficients, FFT size, hop size) are configurable.

**Выжимка:**

For **MFCC in both browser and Node.js**, the two strongest maintained options are **Meyda** and **essentia.js**; a newer third option is **audio-ml**, which explicitly targets both environments and includes an MFCC analyzer.[7][9][11] Of these, **essentia.js** is the most feature-complete and most explicitly configurable for MFCC parameters, while **Meyda** is lighter and simpler but less configurable at the MFCC stage.[6][11]

| Library | Browser + Node.js | License | Approx. package size | Requires WebAssembly? | Maintenance activity | MFCC parameter configurability |
|---|---|---:|---:|---|---|---|
| **Meyda** | Yes, commonly used with Web Audio in the browser; Node usage is also documented in community examples and topic listings[1][7][8] | MIT (project metadata commonly lists MIT; not confirmed in the provided search results) | Small JS-only package; exact size not available in the provided results | **No** | Long-running project, but the provided results do not show recent release activity[1][5][7] | **Limited**: MFCC is supported, but the provided results do not show configurable mel filter count / FFT size / hop size / coefficient count in the public docs snippet[5][7] |
| **essentia.js** | Yes; explicitly supports web browsers and Node.js[10][11][12] | **AGPLv3**[10] | **Large** relative to JS-only libraries because it bundles Essentia C++ via WebAssembly[11] | **Yes**[11] | Actively maintained enough to have current docs and a maintained API surface; the provided results do not include exact commit/release cadence[6][11][12] | **High**: MFCC exposes `numberBands`, `numberCoefficients`, `inputSize`, `sampleRate`, frequency bounds, DCT type, liftering, normalization, etc.[6] |
| **audio-ml** | Yes; described as usable in both browsers and Node.js[9] | MIT (jsDelivr metadata says MIT)[3] | Not enough evidence in the provided results to state an exact size; likely moderate JS package[3][9] | **Not stated** in the provided results | Appears newer than Meyda/essentia.js, but maintenance activity is not visible from the provided results[3][9] | **Likely configurable** via `MFCCAnalyzer`, but the provided results do not expose the exact parameter surface[9] |

**Best fit by use case**
- **Choose essentia.js** if you want the most control over MFCC settings and don’t mind WebAssembly and a heavier runtime footprint.[6][11]
- **Choose Meyda** if you want a lightweight, browser-friendly audio feature extractor and can live with a less explicit MFCC configuration surface.[5][7]
- **Choose audio-ml** if you want a newer universal TypeScript library and can verify its MFCC API fits your needs in the current package docs.[3][9]

**Parameter support details**
- **essentia.js MFCC** is clearly configurable: the documented signature includes `numberBands`, `numberCoefficients`, `inputSize`, `sampleRate`, `lowFrequencyBound`, `highFrequencyBound`, `liftering`, `normalize`, and related options.[6]
- For **Meyda**, the provided results confirm that it computes MFCCs in Web Audio workflows, but they do not show the MFCC-specific knobs in the snippets returned here, so I cannot reliably claim parameter parity with essentia.js from these sources alone.[5][7]
- For **audio-ml**, the package is described as a real-time feature-extraction toolkit with an `MFCCAnalyzer`, but the provided results do not list its MFCC constructor options.[3][9]

**Practical caveat**
- If you need a strict answer on “maintained as of 2025–2026,” the evidence here is strongest for **essentia.js** because the docs are current and explicitly cover browser/Node deployment and MFCC configuration.[6][10][11][12]
- The provided search results do not include recent release timestamps or commit counts for **Meyda** or **audio-ml**, so maintenance comparisons there are necessarily less certain than the feature/API comparison.[1][3][5][7][9]

If you want, I can turn this into a **short recommendation matrix** for “lightweight,” “most configurable,” and “best browser+Node portability.”

## Q2 — Fit

**Запрос:** For detecting low-frequency mechanical and propeller sounds such as drones — not speech — which MFCC parameter values are recommended, and how do they differ from speech defaults (typically 26 mel filters, 13 coefficients, 25 ms window)? Does the mel scale remain appropriate for sources whose energy sits below 1 kHz, or do practitioners use linear or bark scaling instead?

**Выжимка:**

For **low-frequency mechanical/propeller sounds** like drones, practitioners usually start with the same MFCC pipeline but often choose **more filter banks and more coefficients** than speech defaults, because the discriminative structure is spread across a narrower, low-frequency band and may need finer spectral resolution. A reasonable starting point from the literature is **20–40 mel filters** and **around 20–30 coefficients**, with **short windows for transient rotor modulation** or **longer windows** if you want steadier spectral detail; speech defaults such as **26 filters, 13 coefficients, and a 25 ms window** are not mandatory and are often too compact for non-speech event detection.[1][4][6][8][11]

- **Speech-style defaults**: 13 coefficients are widely used as a compact baseline, and 12–15 coefficients are commonly kept in classic MFCC practice.[6][10]
- **Higher-detail sound-event settings**: one sound-event study used **40 mel bands**, and another reported that **15 MFCCs** were enough when most relevant information was below **8 kHz**.[9]
- **Respiratory/non-speech examples**: optimized configurations for non-speech audio often move to **30 coefficients** and can use substantially longer frames when the target pattern evolves slowly over time.[8][11]

For **drones/propellers specifically**, the most defensible recommendation is to **tune the parameters on your own data** rather than assume speech defaults. Based on the cited studies and common MFCC practice, a practical search grid would be: **16–40 filters**, **13–30 coefficients**, and **frame lengths from 25 ms up to 100 ms** depending on whether you care more about short rotor modulation or broader tonal structure.[1][6][8][11]

On the **mel scale question**: yes, the mel scale is still commonly used even when the signal energy is mostly below **1 kHz**, because the mel scale is *approximately linear below 1 kHz and logarithmic above it*.[3][12][13][15] That means it does **not stop being sensible** in the sub-1 kHz region; in fact, the scale is explicitly linear there.[3][12][13]

However, for **machine monitoring / sound-event recognition** rather than human speech perception, some practitioners do test **linear** or **exponential** filter-bank spacings as alternatives to mel, and that work exists specifically because the mel scale is not always optimal for sound-event tasks.[2] So the practical answer is:

- **Mel scale**: still a strong default, especially if you want to stay close to standard MFCC tooling.[3][12][15]
- **Linear scale**: worth trying when precise low-frequency spacing matters and your signal is concentrated in a narrow band.[2]
- **Bark scale**: also sometimes used in audio analysis, but the results you provided specifically document **linear vs. mel vs. exponential** alternatives, not bark as the primary recommended substitute.[2]

If you want a concise starting configuration for **drone detection**, a good first pass is:

- **40 mel filters**
- **20–30 MFCCs**
- **25–50 ms window**
- **10 ms hop**
- keep **mel** as the baseline, then compare against **linear filter banks** if performance plateaus.[1][2][6][8][11]

If you want, I can turn this into a **parameter sweep plan** for drone audio classification, including recommended ranges for **sample rate, FFT size, hop length, and whether to include delta/delta-delta features**.

## Q3 — Risk

**Запрос:** What are the known failure modes of MFCC for non-speech acoustic detection compared with raw spectral features such as spectral flux or harmonic analysis? Specifically: sensitivity to background noise and wind, behaviour under varying distance and Doppler shift, loss of harmonic structure information, and which preprocessing steps (pre-emphasis, normalisation, denoising) practitioners consider mandatory.

**Выжимка:**

MFCCs are **more fragile than raw spectral features** when the task depends on fine acoustic structure outside speech: they can work well as a compact representation, but they are known to lose detail that is useful for non-speech events, especially under **noise, wind, reverberation, changing distance, and channel mismatch**.[1][3][5] In contrast, raw or lightly processed spectral features such as **spectral flux** or explicit **harmonic** representations preserve more frame-level structure, which makes them better aligned with tasks that depend on transient motion, timbral change, or harmonic spacing rather than speech-like spectral envelopes; this is an inference from the way MFCCs are constructed and from reports that MFCCs are not robust in noisy or mismatched conditions.[1][4][5]

- **Sensitivity to background noise and wind:** MFCCs are repeatedly reported as **not very robust under noisy conditions** and to degrade substantially when train/test noise differs.[4][5][8][9] In one industrial voice-recognition study, accuracy collapsed from **93.51%** at lower machine-noise levels to **29.17%** at 85 dB, and the authors concluded external machine noise was the only statistically significant factor above a threshold.[2] Wind is not singled out in these sources, but wind typically acts as low-frequency, nonstationary background noise, so the same failure mode applies by analogy; that part is an inference rather than an explicit claim in the sources.[4][8][9]

- **Varying distance and channel mismatch:** MFCCs are described as relatively independent of absolute level, but they are **sensitive to channel mismatch between training and testing** and should be normalized for such effects.[3] For non-speech detection, changing microphone distance alters level, spectral coloration, and reverberant mix; MFCCs partly discard absolute amplitude but remain vulnerable to the resulting channel/reverberation mismatch, which the literature identifies as a major failure mode.[3][5]

- **Doppler shift:** None of the retrieved sources directly quantify MFCC behavior under Doppler shift. The relevant limitation is that MFCCs summarize short-time spectral envelopes and thus can blur or alias time-varying frequency structure; by comparison, raw spectral tracking or harmonic analysis is usually better suited when frequency movement itself is informative. That statement is a reasoned inference from the feature definitions, not an explicit result in the cited papers.[1][3][4]

- **Loss of harmonic structure information:** This is one of the clearest MFCC weaknesses for non-speech audio. MFCCs compress the spectrum into a low-dimensional cepstral envelope, which is useful for broad timbre but can **discard harmonic spacing, partials, and fine spectral detail** that explicit harmonic analysis retains.[1][3][10] That makes MFCCs a weaker choice when the target class is defined by harmonics, resonances, rotation-related sidebands, or other narrowband structure.

- **Preprocessing that practitioners treat as mandatory:**
  - **Normalization:** commonly treated as necessary when there is channel mismatch or varying gain; one MFCC-VAD paper explicitly says channel and speaker factors **should be normalized**.[3]
  - **Denoising / robust front-end processing:** often treated as effectively required in noisy or reverberant environments because standard MFCCs “suffer dramatically” under noise and reverberation mismatch.[4][5][8]
  - **Pre-emphasis:** not supported by the retrieved sources as universally mandatory, but it is a common MFCC step in speech pipelines; for non-speech tasks it is more of a tunable choice than a strict requirement. The evidence provided here does not justify calling it mandatory.
  - **Whitening / feature normalization after extraction:** one non-speech sound-event paper explicitly used **whitening and normalization** after MFCC/GFCC concatenation before classification, which suggests practitioners often rely on post-extraction normalization for robustness.[4]

A concise practical reading is:

| Issue | MFCCs | Raw spectral / harmonic features |
|---|---|---|
| Background noise / wind | Often fragile, especially under mismatch[4][5][8][9] | Usually more information remains, but still noise-sensitive |
| Distance / channel variation | Sensitive to mismatch; normalization helps[3] | Can also drift, but preservation of detail can help adaptation |
| Doppler shift | No direct evidence in sources; likely weak for frequency motion | Typically better when motion itself matters |
| Harmonic structure | Often compressed away[1][3][10] | Preserved explicitly |

If you want, I can turn this into a **recommended feature pipeline for non-speech acoustic detection** and separate what is *evidence-backed* from what is *engineering practice*.
