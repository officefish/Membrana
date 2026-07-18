# Research: Собственный полевой корпус — спецификация трека и ежедневная рутина сбора

> Источник: perplexity-api

## Q1 — Audio segment specification

**Запрос:** Audio segment specification: What technical characteristics must an audio segment have for maximum quality recognition of a recognizable object in it: optimal clip duration, sample rate, bit depth, mono versus multichannel, acceptable signal-to-noise ratio, useful frequency range, and how these parameters affect classifier accuracy in acoustic event detection?

**Выжимка:**

For maximum quality recognition of a recognizable object in acoustic event detection (AED), the audio segment should generally be **1 second** in duration, recorded at **16–44.1 kHz sample rate**, **16–24-bit depth**, and with a **signal-to-noise ratio (SNR) of at least 6 dB** (dropping accuracy by ~10% per 5 dB loss below this). The useful frequency range is typically **50 Hz to 8–16 kHz**, and **mono** recording is often sufficient unless spatial localization is required.

### Key Technical Characteristics and Their Impact on Classifier Accuracy

| Parameter | Optimal Value | Impact on Classifier Accuracy |
|-----------|---------------|-------------------------------|
| **Clip Duration** | **1 second** [2][5] | Shorter frames (<100 ms) miss event context; longer clips (>5 s) introduce inactive frames that dilute loss and reduce precision [2][4]. 1 s aligns with median event duration (6.75 s) and prediction intervals of models like YAMNet (~0.96 s) [2]. |
| **Sample Rate** | **16 kHz** (minimum) to **44.1 kHz** [3][1] | 16 kHz captures up to 8 kHz, sufficient for most environmental sounds [3]. Higher rates (44.1 kHz) improve transient resolution but increase dimensionality; 16 kHz is standard for log-mel spectrogram extraction in SED systems [3]. |
| **Bit Depth** | **16-bit** (minimum) to **24-bit** [1][10] | 16-bit provides adequate dynamic range for most AED tasks [10]; 24-bit preserves subtle amplitude details in low-SNR scenarios, beneficial for bioacoustic or fine-grained detection [1]. |
| **Channels** | **Mono** (preferred) or **Stereo** [1][10] | Mono reduces computational load and is sufficient for event classification [1]. Stereo is useful only if spatial cues (e.g., direction) aid detection, but most datasets (e.,g., DCASE) use stereo for annotation flexibility, not classifier necessity [1][10]. |
| **SNR** | **≥6 dB** (ideal); **0 dB** = human visibility threshold [6] | At **0 dB SNR**, accuracy drops to ~24% for 61 classes [6]. Recognition rates fall by **~10% per 5 dB** decrease in SNR [6]. For robustness, SNR > 6 dB is recommended. |
| **Frequency Range** | **50 Hz – 16 kHz** [2][7] | Most acoustic events (e.g., vehicle sounds, alarms) have significant energy below 8 kHz; 16 kHz covers transients and harmonics [2]. Very low frequencies (<50 Hz) are often noise; high frequencies (>16 kHz) add little for common events [7]. |
| **Feature Window** | **40 ms** (log-mel) [11] | 40 ms windows balance harmonic and transient sound analysis [11]. Shorter windows (25 ms) may miss event structure; longer windows reduce temporal resolution [2][11]. |

### How Parameters Affect Classifier Accuracy

- **Duration**: Models like BEATs use 25 ms frames but require **1 s** for reliable event classification due to median event duration [2]. Down-weighting inactive frames (e.g., via SRL, AFL) improves F-score and ROC AUC significantly [4].
- **SNR**: Accuracy degrades sharply below 6 dB; at 0 dB, systems recognize only ~1/3 of events [6].
- **Frequency & Sample Rate**: 16 kHz audio with 128 mel bins is standard for spectrogram-based SED [3]. Higher frequencies (>16 kHz) rarely improve performance for common events.
- **Channel Choice**: Mono is preferred for classification unless spatial info is critical; stereo adds redundancy without major accuracy gains in most datasets [1][10].

In practice, **1-second mono clips at 16 kHz, 16-bit, with SNR ≥6 dB**, transformed into **40 ms log-mel spectrograms**, offer the best trade-off between accuracy and computational efficiency for most acoustic event detection tasks.

## Q2 — Track metadata standards

**Запрос:** Track metadata standards: How are audio and music track metadata properly filled in: which tag standards and fields are used (ID3, Broadcast Wave BWF, iXML, RIFF INFO, JSON sidecar), which fields are mandatory for machine learning datasets, and how are provenance, recording conditions and licensing documented in published audio dataset specifications?

**Выжимка:**

Audio track metadata is properly filled by selecting the tag standard that matches the file container: **ID3** for MP3, **RIFF INFO** for plain WAV/AIFF, and **Broadcast Wave (BWF)** extensions (**`bext`**, **iXML**, **aXML**) for professional broadcast/film workflows, while **JSON sidecars** are increasingly used for dataset provenance where internal embedding is impractical.

### 1. Tag Standards and Field Mapping by Format

Different audio containers support specific metadata schemas. The most critical standards and their primary fields are:

| Format / Container | Primary Tag Standard | Key Fields (Standard Codes) | Typical Use Case |
| :--- | :--- | :--- | :--- |
| **MP3** | **ID3v2.3 / v2.4** | `TIT2` (Title), `TPE1` (Artist), `TALB` (Album), `TRCK` (Track #), `TCON` (Genre), `TCOP` (Copyright), `TSRC` (ISRC) [1][2][4] | Consumer music, streaming |
| **WAV / AIFF** | **RIFF INFO** | `INAM` (Title), `IART` (Artist), `IPRD` (Album), `ICRD` (Date), `IGNR` (Genre), `ICMT` (Comment) [1][2][3][7] | Basic WAV files, legacy archiving |
| **BWF** | **`bext` (Broadcast Ext.)** | `Title`, `Originator`, `OriginatorRef`, `OriginationDate`, `OriginationTime`, `TimeReference`, `UMID`, `CodingHistory` [1][2][3] | Broadcast, film, professional archiving |
| **BWF** | **iXML** | Flexible XML structure supporting `Title`, `Artist`, `ISRC`, `Loudness` (EBU R-128), `RecordingConditions` [2][10][13] | Complex professional workflows, loudness metadata |
| **Any** | **JSON Sidecar** | `provenance`, `license`, `recording_setup`, `source_url`, `dataset_id` | Machine learning datasets, external documentation |

*   **ID3 Details:** ID3v2.3.0 is the most widely adopted "de facto" standard for MP3s, offering flexible storage for technical info (e.g., equalization) and meta-info (title, performer) [4]. It supports numeric genres and multiple date frames (`TDRC`, `TYER`) [2].
*   **BWF & iXML:** Broadcast WAV adds the `bext` chunk, which is the primary location for archival metadata like timecodes and origination data [2][3]. **iXML** is an XML-based format designed specifically for BWF, offering greater flexibility than `bext` and supporting EBU R-128 loudness standards [2][10].
*   **RIFF INFO Limitations:** Plain WAV files using RIFF INFO have limited fields (only title, artist, album, year, comment, genre, track number) and are insufficient for complex archival needs [7].

### 2. Mandatory Fields for Machine Learning (ML) Datasets

For machine learning datasets, internal file tags (ID3/iXML) are often insufficient. The standard practice is to use a **JSON sidecar** or a **CSV manifest** that maps audio files to their labels and provenance. While no single universal "mandatory" list exists, the **AudioSet** and **Common Voice** specifications typically require:

*   **Unique Identifier:** A persistent ID for the file (e.g., filename or UUID) to ensure deduplication.
*   **Label/Class:** The target variable for training (e.g., `genre`, `emotion`, `speaker_id`).
*   **Provenance Source:** The original URL or archive location where the audio was obtained.
*   **License:** Explicit licensing terms (e.g., `CC-BY-4.0`, `Public Domain`) to ensure legal compliance [1][11].
*   **Duration:** Audio length in seconds (critical for batching and model input).
*   **Recording Conditions:** Sampling rate, bit depth, and channel count (e.g., `44.1kHz`, `16-bit`, `mono`).

*Note:* While fields like `Title` and `Artist` are common in music metadata, they are often **optional** in ML datasets unless the task is specifically authorship or title recognition. The critical mandatory fields are those that define the **training target** and **legal usage**.

### 3. Documenting Provenance, Recording Conditions, and Licensing

Published audio dataset specifications (e.g., **LibriSpeech**, **MusicNet**, **Common Voice**) document these elements in three primary ways:

#### A. Provenance (Origin & History)
Provenance is documented using the **`Originator`** and **`OriginatorReference`** fields in the **`bext`** chunk or **iXML** [1][3].
*   **Archival Location:** The `15BIARL` field (Archival Location) in BWF metadata explicitly states where the subject is archived [5].
*   **Coding History:** The `CodingHistory` field in `bext` tracks the chain of encoding/processing (e.g., "MP3 -> WAV -> FLAC") [1].
*   **Unique Identifiers:** **UMID** (Unique Material Identifier) and **USID** (Unique Source Identifier) are supported in BWF to uniquely identify the source material [2][6].

#### B. Recording Conditions
Recording conditions are rarely stored in standard RIFF INFO or ID3 tags due to their limited field sets. They are documented in:
*   **iXML:** Supports custom XML fields for microphone type, room acoustics, and gain settings [2][10].
*   **JSON Sidecars:** The most common method for ML datasets, where a `metadata.json` file lists:
    ```json
    {
      "recording_conditions": {
        "microphone": "Sennheiser MKH 816",
        "room": "Studio A (Controlled)",
        "gain": "-12dB",
        "sample_rate": 48000
      }
    }
    ```
*   **Technical Metadata:** Schemas like **Dublin Core**, **EBUCore**, and **METS** are used for archival collections to standardize descriptive and technical metadata [1].

#### C. Licensing
Licensing is typically **not** embedded in the audio file's binary tags (ID3/RIFF) for ML datasets, as these tags are often stripped or ignored by data loaders.
*   **Standard Practice:** Licensing is declared in the **dataset README** and the **JSON sidecar** under a `license` field.
*   **Embedded Rights:** In professional BWF/iXML workflows, the `UsageRights` field in `bext` or iXML can document rights, but this is less common in open-source ML datasets [2].
*   **ISRC:** The **ISRC** (International Standard Recording Code) is the standard for uniquely identifying musical recordings and can be embedded in ID3 (`TSRC`) or BWF (`ISRC`) [2][10].

### Summary of Best Practices
1.  **For Music Distribution:** Use **ID3v2.4** with all standard fields (`TIT2`, `TPE1`, `TALB`, `TRCK`, `TCON`, `TCOP`, `TSRC`).
2.  **For Professional Archiving/Broadcast:** Use **BWF** with **`bext`** and **iXML** for rich origination, timecode, and loudness data.
3.  **For Machine Learning:** Prioritize a **JSON sidecar** or **CSV manifest** over internal tags. Mandate `license`, `source_url`, `label`, and `duration` fields, while storing recording conditions in the sidecar.

## Q3 — Alignment and normalization

**Запрос:** Alignment and normalization: How to properly align and normalize sounds for datasets used to train neural networks: loudness normalization (LUFS EBU R128 versus peak normalization), silence trimming, resampling, DC offset removal, per-file versus per-corpus statistics, and which transformations must be avoided because they destroy the signal the model needs?

**Выжимка:**

For neural network audio datasets, **loudness normalization (targeting −23 LUFS per EBU R128)** is generally preferred over **peak normalization** because it equalizes perceived volume across files without compressing dynamics, whereas peak normalization can under-represent quiet content or fail to prevent clipping if dynamic range varies wildly [1][2][11]. However, the optimal target LUFS depends on the specific model domain (e.g., speech often uses −23 LUFS, while music streaming datasets may target −14 LUFS) [11][1].

### Core Normalization Strategy: LUFS vs. Peak
| Feature | Loudness Normalization (EBU R128) | Peak Normalization |
| :--- | :--- | :--- |
| **Metric** | **Integrated Loudness** (perceived average, weighted by human frequency sensitivity) [1][4] | **True Peak** (highest instantaneous sample value) [1][11] |
| **Target** | **−23 LUFS** (standard for broadcast/games); tolerance ±0.5 LU (±1 LU for live) [1][5] | **0 dBFS** (or −1 dBTP to prevent inter-sample clipping) [1][11] |
| **Pros for ML** | Stabilizes **signal-to-noise ratio (SNR)** and relative dynamics; prevents quiet files from being dominated by noise [2][11] | Preserves exact waveform amplitude; computationally simpler [11] |
| **Cons for ML** | Requires loudness metering (ITU-R BS.1770); heavy limiting can alter loudness metrics if applied incorrectly [1][8] | Quiet files remain quiet (low SNR), potentially causing the model to ignore them; loud files may clip if not limited first [2][11] |

**Recommendation:** Use **loudness normalization** for datasets with mixed genres or recording conditions to ensure consistent input features. If training on raw waveforms where absolute amplitude is a target variable (e.g., speech synthesis), **peak normalization** to −1 dBTP may be safer to preserve the original signal's dynamic range, provided a noise gate handles low-SNR segments [1][8].

### Signal Processing Pipeline for Datasets
1.  **DC Offset Removal**:
    *   **Must do:** Remove DC offset (average value ≠ 0) to prevent low-frequency artifacts and ensure the model learns zero-mean signals. This is a simple subtraction of the mean from the waveform [standard audio practice, implied by signal integrity].
2.  **Silence Trimming (VAD)**:
    *   **Apply a Voice Activity Detector (VAD)** or energy-based threshold to trim silence. For speech models, this reduces training time and focuses the model on phonetic content.
    *   **Caution:** Avoid aggressive trimming that removes leading/trailing consonants or pauses critical for prosody. Use a "soft" trim (e.g., leave 10–50ms of silence) if the model needs to learn start/end boundaries [standard VAD practice].
3.  **Resampling**:
    *   **Standardize** all files to a single frequency (e.g., **16 kHz** for speech, **44.1 kHz or 48 kHz** for music).
    *   Use **high-quality resampling algorithms** (e.g., sinc interpolation) to avoid aliasing. Low-quality resampling introduces artifacts that the model may mistake for signal features.
4.  **Per-File vs. Per-Corpus Statistics**:
    *   **Per-File Normalization:** Apply loudness/peak normalization to each file individually. This is standard for **datasets with heterogeneous recording conditions** (e.g., user-generated audio) to ensure uniform input magnitude [2].
    *   **Per-Corpus Normalization:** Calculate mean/std statistics across the entire dataset and normalize all files to these global statistics. This is preferred for **scientific datasets** where absolute amplitude relationships between files must be preserved (e.g., comparing signal strength across experiments) [standard ML preprocessing].
    *   **Guideline:** For general NN training (speech recognition, music generation), **per-file loudness normalization** is typically superior to prevent the model from learning the dataset's average loudness as a bias.

### Transformations to Avoid (Signal Destruction)
Avoid any transformation that alters the **time-domain waveform** in a way the model cannot reconstruct or that removes high-frequency information the model needs:
*   **Aggressive Noise Reduction / Denoising:** Can remove subtle signal features (e.g., breath sounds in speech, harmonic overtones in music) and introduce musical noise artifacts that confuse the model [standard ML audio warning].
*   **Dynamic Range Compression (DRC):** Reduces the difference between loud and quiet parts. If the model needs to learn dynamics (e.g., for expressive generation), compression destroys this information [2].
*   **Low-Pass Filtering (below signal bandwidth):** Removing frequencies above the expected bandwidth (e.g., cutting >8 kHz for 16 kHz speech) is standard, but **over-filtering** (e.g., cutting >4 kHz for high-fidelity music) destroys spectral detail [standard signal processing].
*   **Non-Linear Distortion:** Do not apply distortion, clipping, or bit-crushing artificially unless the *task* is to handle degraded audio; otherwise, it creates unlearnable artifacts.
*   **Phase Randomization:** Randomizing phase destroys the temporal structure of the signal, making it impossible for the model to learn onset/offset timing [critical for waveform models].

### Summary Workflow
1.  **DC Offset Removal** (subtract mean).
2.  **Resample** to target frequency (high-quality filter).
3.  **Silence Trim** (gentle VAD, keep punctuation pauses).
4.  **Loudness Normalize** to **−23 LUFS** (ITU-R BS.1770), then check True Peak ≤ **−1 dBTP**; apply limiter *only* if peak exceeds ceiling, then re-measure loudness [1][8].
5.  **Avoid** compression, aggressive denoising, or phase manipulation.

This pipeline ensures the model receives consistent, high-fidelity input where the signal's semantic content is preserved, and the amplitude distribution is standardized.
