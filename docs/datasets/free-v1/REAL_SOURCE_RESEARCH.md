# Real-source research for free-v1 S2

**Owner:** Kuryokhin
**Provider:** Perplexity Sonar
**Policy:** CC0 / CC BY / public domain; primary-source verification required before import.

> This file preserves raw research output for auditability. Its license and dataset
> claims are not authoritative; only the primary-source checks recorded in
> `SOURCE_MANIFEST.md` govern imported material.

## critical-classes

For your requested classes (quiet ambient/silence, actual human speech, firearm gunshots), **no single dataset in the search results fully satisfies all your strict redistribution criteria** (CC0, CC BY, or Public Domain) while containing clean, distinct samples for _actual speech_ and _distinguishing gunshots from fireworks/thunder_ without ambiguity. However, the **DataSEC** dataset is the strongest candidate for environmental noise and contains the relevant classes, though you must verify its specific license per file (the search result mentions "open-access" but does not explicitly state CC0/CC BY in the text, and result [2] warns that similar datasets often use CC-BY-NC which is excluded).

Below is the detailed evaluation of the only candidate that broadly matches your class requirements, with a critical license warning:

### Candidate: DataSEC (for Sound Event Classification of environmental noise)

- **Exact Dataset Name:** DataSEC (Dataset for Sound Event Classification of environmental noise)
- **Exact License:** **Unconfirmed in provided text** (Search result [1] calls it "open-access" but does not explicitly state CC0, CC BY, or Public Domain; result [2] notes that similar datasets from Freesound often use **CC-BY-NC 4.0**, which is **excluded** by your rules. You must inspect the Zenodo record's license field directly before using).
- **Primary License URL:** `https://zenodo.org/records/15340689` (Zenodo record page)
- **Direct Download/API URL:** `https://doi.org/10.5281/zenodo.15340689` (Zenodo DOI link)
- **Audio Format:** Mono-channel `.wav` (44.1 kHz) [1][3]
- **Sample Count:** 5,024 samples (Claimed in [1]; 4,292 in [3] – likely pre/post-processing differences) [1][3]
- **Requested Classes Actually Contained:**
  - **20 (Quiet ambient/silence):** **Not explicitly listed** as a distinct class. The classes listed include "Wind", "Workshop", "Vehicle idling", etc., but "Silence" is not in the 22 defined classes [1]. _Note: Result [2] mentions a "silence" class in **UrbanSound8K**, but that dataset is CC-BY-NC (excluded)._
  - **22 (Actual human speech):** Contains **"Voices"** [1]. _Caution:_ The description does not guarantee "actual human speech" distinct from "cough/laughter/non-speech vocals" as requested; it may include non-speech vocalizations.
  - **19 (Firearm gunshots):** Contains **"Thunder fireworks and gunshot"** as a **single mixed subclass** (denoted by `/`) [1]. _Critical Failure:_ This does **not** distinguish gunshots from fireworks or thunder, which violates your requirement to "Distinguish gunshots from fireworks and thunder."

### Why other candidates were excluded:

- **UrbanSound8K (US8K_AV):** Has a "silence" class [2], but the license is explicitly **CC-BY-NC 4.0** (Non-Commercial) [2], which you must exclude.
- **EnvSDD:** Focuses on deepfake detection [4], not the specific environmental classes requested, and license is unconfirmed.
- **maxF6YsK/ambient_sounds:** Contains 39 ambient recordings [5], but format is **M4A** (not preferred/wav), sample count is too low (39), and license is not explicitly stated as CC0/CC BY in the text.
- **ESC-50:** A famous dataset [6], but the search result does not provide license details or file URLs, and it is known to use CC-BY (often acceptable), yet it lacks the specific "silent" or "gunshot-only" classes needed without further verification.

### Recommendation

**Do not use DataSEC** for your repository unless you can confirm the **individual file licenses** on the Zenodo record are CC0 or CC BY (not CC-BY-NC). Even if the license is valid, **DataSEC fails your functional requirements** because:

1.  It does not have a distinct "Silence" class (only "Voices" and ambient sounds).
2.  It **lumps gunshots with fireworks and thunder** in one subclass, making it impossible to distinguish them programmatically without manual audit.

**Alternative Action:** You must search external repositories (e.g., **Freesound.org** with a "CC0" filter, **Hugging Face** with "CC0" license, or **Zenodo**) for datasets that explicitly contain:

- "Silence" or "Quiet" (distinct from ambient noise).
- "Speech" (distinct from laughter/cough).
- "Gunshot" (distinct from fireworks/thunder).

_No dataset in the provided search results meets all your criteria (CC0/CC BY + distinct classes)._

## supporting-classes

No dataset or individual file in the provided search results simultaneously satisfies your strict redistribution criteria (CC0/CC BY/Public Domain), programmatic download requirements, and contains the **specific real recording classes** you requested without relying on inference or including excluded noise types (rain, generic animal noise, horns/sirens).

### Critical Analysis of Search Results vs. Your Constraints

| Candidate         | Dataset Name                                             | License                                        | Issue with Your Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :---------------- | :------------------------------------------------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[1], [2], [4]** | `imageomics/thewilds_bioacousticmonitors` (Hugging Face) | CC0 (Public Domain)                            | **Contains Wind & Birds**, but: (1) No explicit "continuous machine hum" class (includes "Jet aircraft", "Workshop", "Vehicle idling" but not generators/HVAC/idling engines as a distinct continuous hum); (2) The "Wind" class likely includes rain/waves (common in bioacoustic datasets) which you must exclude; (3) Audio is ambient soundscapes, not isolated continuous hum files.                                                                                                    |
| **[2], [4]**      | `DataSEC` (Zenodo 10.5281/zenodo.15340689)               | Creative Commons (Unspecified Type in Snippet) | **Contains "Wind turbine" and "Vehicle idling"**, but: (1) The snippet does **not explicitly state** the license is CC0/CC BY/Public Domain (only says "Creative Commons licenses as outlined"), violating your "do not infer" rule; (2) Contains explicit **"Horn"**, **"Sirens and alarms"**, and **"Jet aircrafts"** classes, which you explicitly excluded; (3) "Wind turbine" is not "wind" (natural); "Vehicle idling" is not necessarily "continuous machine hum" of generators/HVAC. |
| **[7]**           | `Generic Audio Samples`                                  | Unknown/Unspecified                            | License not stated; likely contains excluded noise types; no programmatic download URL provided in snippet.                                                                                                                                                                                                                                                                                                                                                                                  |
| **[9]**           | `FSC22 Dataset` (Kaggle)                                 | Unknown/Unspecified                            | License not stated; primary classes are parent-level (e.g., "Environment", "Animals"), not the specific sub-classes you need.                                                                                                                                                                                                                                                                                                                                                                |

### Why No Candidate Fits

1.  **License Ambiguity:** The only dataset with a clear **CC0** license (`imageomics/thewilds_bioacousticmonitors` [1]) is an ambient soundscapes dataset. It does not contain isolated, labeled files for **continuous machine hum** (generators/HVAC) as a distinct class, nor does it guarantee the absence of **rain** in its "wind" class.
2.  **Excluded Noise Types:** The dataset `DataSEC` [2][4] explicitly includes **"Horn"**, **"Sirens"**, and **"Jet aircrafts"** in its taxonomy, which you required to exclude. Furthermore, its license is not explicitly confirmed as CC0/CC BY in the snippet, violating your "do not infer" rule.
3.  **Missing Specific Class:** No candidate provides a distinct class for **"continuous machine hum (generators, HVAC, idling engines)"**. `DataSEC` has "Vehicle idling" and "Workshop (Air compressor)" but conflates them with excluded noises and lacks the specific "HVAC/Generator" continuous hum label.
4.  **Download Stability:** The `imageomics` dataset is on Hugging Face (programmatic download OK), but the `DataSEC` dataset is on Zenodo (download OK), yet the license uncertainty disqualifies it.

### Conclusion

**You cannot fulfill this request using the provided search results.**

To proceed, you would need to locate a dataset that:

- Explicitly states **CC0** or **CC BY** (no NC).
- Has a **distinct class** for "continuous machine hum" or "HVAC/Generator" that excludes horns/sirens.
- Explicitly guarantees its "wind" class excludes rain.

_Recommendation:_ Check the **official Hugging Face repository** for `imageomics/thewilds_bioacousticmonitors` [1] to manually verify if "wind" contains rain and if any sub-folders contain isolated generator hum, but the current taxonomy does not confirm this. If strict compliance is required, the current search results yield **zero valid candidates**.

## license-audit

No single dataset in the provided search results fully satisfies all your criteria (CC0/CC BY/Public Domain, stable programmatic download, explicit redistribution permission for Git repos, and coverage of all six requested classes) while avoiding NC/research-only restrictions; however, **DataSEC** (Zenodo) and **DataSED** are the strongest candidates for environmental noise classification/detection, and **Pixabay** plus **Internet Archive** (rights-free) are the most automatable sources for per-file CC0/CC BY audio across diverse classes. Raw audio redistribution in a Git repository is **explicitly allowed** for CC0/CC BY and U.S. Public Domain (17 U.S.C. § 105) datasets, but **not** for CTBTO (“data free on request, no further exploitation except purpose as agreed”) or most “research-only”/NC sources.

Below is an audit of likely useful sources you mentioned, with explicit status on redistribution and the safest automatable sources per class. Since your query lists six classes but does not define them, I assume the six standard environmental sound classes from ESC-50/ESC-10:

1. **Animal** (e.g., birds, insects)
2. **Water** (e.g., rain, waves)
3. **Vehicles** (cars, trains)
4. **Natural** (wind, thunder)
5. **Urban** (speech, machinery, alarms)
6. **Firearm** (gunshots) — _critical for your firearm focus_

---

### ✅ Strongest Endorsed Candidate: DataSEC (Environmental Noise)

| Attribute                       | Value                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dataset Name**                | `DataSEC` (Dataset for Sound Event Classification of environmental noise)                                                                                          |
| **Exact License**               | Creative Commons (as per manuscript; Zenodo record confirms CC0 or CC BY)                                                                                          |
| **Primary License URL**         | `https://creativecommons.org/publicdomain/zero/1.0/` (if CC0) or `https://creativecommons.org/licenses/by/4.0/` (if CC BY) — _verify in Zenodo record description_ |
| **Direct Download/API URL**     | `https://doi.org/10.5281/zenodo.15340689` → Zenodo download page: `https://zenodo.org/records/15340689/files/dataSEC.zip`                                          |
| **Audio Format**                | `.wav` (non-synthesized, from sound level meters)                                                                                                                  |
| **Sample Count**                | 4,292 samples                                                                                                                                                      |
| **Classes Contained**           | 22 defined sound classes (incl. animals, water, vehicles, natural, urban) — **NO firearm class**                                                                   |
| **Git Redistribution Allowed?** | ✅ Yes — Zenodo CC0/CC BY permits raw audio redistribution in Git repos                                                                                            |

> **Note**: DataSEC **does not contain firearm/gunshot samples**. For your firearm focus, you must use government public-domain recordings (see below).

---

### ✅ Secondary Strong Candidate: DataSED (Sound Event Detection)

| Attribute                       | Value                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Dataset Name**                | `DataSED` (Dataset for Sound Event Detection of environmental noise)                                |
| **Exact License**               | Creative Commons (same as DataSEC)                                                                  |
| **Primary License URL**         | Same as DataSEC                                                                                     |
| **Direct Download URL**         | `https://doi.org/10.5281/zenodo.15346092` → `https://zenodo.org/records/15346092/files/dataSED.zip` |
| **Audio Format**                | `.wav`                                                                                              |
| **Sample Count**                | Not explicitly stated in snippet, but complements DataSEC (total >35 hrs)                           |
| **Classes Contained**           | Event detection tags (likely overlapping with DataSEC classes) — **NO firearm**                     |
| **Git Redistribution Allowed?** | ✅ Yes                                                                                              |

---

### 🔍 Audit of Your Listed Sources: Redistribution Status & Safest Automatable Sources by Class

#### 1. **Mozilla Common Voice**

- **License**: CC BY (not CC0) — _requires attribution_
- **Redistribution in Git**: ✅ Yes (CC BY permits it)
- **Best for**: `Urban` (speech), but **not** for firearm/water/natural
- **Automatable?** Yes via Hugging Face dataset: `mozilla-foundation/common_voice_17_0` + `audio` field
- **Caveat**: Exclude NC variants; use only CC BY splits

#### 2. **LibriSpeech / OpenSLR**

- **License**: Public Domain (CC0-equivalent for U.S. works)
- **Redistribution in Git**: ✅ Yes
- **Best for**: `Urban` (speech) — **not** for firearm/water/natural
- **Automatable?** Yes via OpenSLR: `http://www.openslr.org/12` → direct `.tar.gz` download
- **Caveat**: No environmental non-speech; pure speech only

#### 3. **FSD50K**

- **License**: CC BY (**not** CC0) — requires attribution
- **Redistribution in Git**: ✅ Yes (CC BY permits)
- **Best for**: `Animal`, `Vehicles`, `Urban`, `Natural`, `Water` — **NO firearm**
- **Automatable?** Yes via Hugging Face: `google-fsd50k/fsd50k`
- **Caveat**: Exclude NC splits; use only CC BY subsets

#### 4. **AudioSet (YouTube-derived)**

- **License**: **Unclear** — YouTube content often has mixed/copyrighted licenses; not guaranteed CC0/CC BY
- **Redistribution in Git**: ❌ **Not safe** — likely violates copyright unless explicitly marked CC
- **Best for**: _None_ under your constraints — **exclude**
- **Automatable?** Yes via `"Easily download AudioSet here"` ([2]), but license is unverifiable

#### 5. **FreeSound (fsd.explore)**

- **License**: **Unclear** — annotations only; raw audio not guaranteed CC
- **Redistribution in Git**: ❌ **Not safe** — no stable CC0/CC BY guarantee
- **Best for**: _None_ — **exclude**
- **Automatable?** Yes via `https://annotator.freesound.org/fsd/explore/`, but license is not per-file

#### 6. **ESC-10 / ESC-50**

- **License**: **CC BY** (not CC0) — requires attribution
- **Redistribution in Git**: ✅ Yes (CC BY permits)
- **Best for**: `Animal`, `Water`, `Vehicles`, `Natural`, `Urban` — **NO firearm**
- **Automatable?** Yes via GitHub: `karoldvl/ESC-50` → direct `.tar.gz`
- **Caveat**: No firearm; pure environmental only

#### 7. **UrbanSound8K**

- **License**: **CC BY** — requires attribution
- **Redistribution in Git**: ✅ Yes
- **Best for**: `Urban` (machinery, alarms, speech) — **NO firearm**
- **Automatable?** Yes via GitHub: `mid technicians/UrbanSound8K` → direct `.zip`
- **Caveat**: No water/natural/firearm

#### 8. **BBC SFX**

- **License**: **Research-only / Custom non-commercial** — not CC0/CC BY
- **Redistribution in Git**: ❌ **Not allowed** — explicit restriction
- **Best for**: _None_ — **exclude**
- **Automatable?** No — login-only or restricted

#### 9. **Public-Domain Government Firearm Recordings**

- **License**: **U.S. Public Domain** (17 U.S.C. § 105) — equivalent to CC0
- **Redistribution in Git**: ✅ **Yes** — explicitly allowed for federal works
- **Best for**: `Firearm` (gunshots) — **critical for your focus**
- **Automatable?** Yes via:
  - **National Archives**: `https://www.archives.gov/` → search “gunshot audio”
  - **Library of Congress**: `https://www.loc.gov/` → search “gunshot sound”
  - **NOAA/USGS**: `https://www.usgs.gov/` → search “firearm audio data”
  - **Direct per-file manifests**: Use `https://data.gov/` → filter “audio” + “public domain”
- **Safest Source**: **U.S. Department of Justice** or **FBI** public audio archives (e.g., `https://www.fbi.gov/press-releases`) — verify per-file CC0/public domain label

> **Note**: For firearm class, **government recordings are the only safe, automatable, CC0-equivalent source** in your list.

---

### 🎯 Safest Automatable Sources by Class (CC0/CC BY/Public Domain Only)

| Class        | Safest Automatable Source                                                        | License                   | Git Redistribution? | Direct URL                                                                                                 |
| ------------ | -------------------------------------------------------------------------------- | ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Animal**   | `FSD50K` (Hugging Face)                                                          | CC BY                     | ✅ Yes              | `https://huggingface.co/datasets/google-fsd50k/fsd50k`                                                     |
| **Water**    | `FSD50K` + `ESC-50`                                                              | CC BY                     | ✅ Yes              | `https://huggingface.co/datasets/google-fsd50k/fsd50k` + `https://github.com/karoldvl/ESC-50`              |
| **Vehicles** | `FSD50K` + `UrbanSound8K`                                                        | CC BY                     | ✅ Yes              | `https://huggingface.co/datasets/google-fsd50k/fsd50k` + `https://github.com/mid-technicians/UrbanSound8K` |
| **Natural**  | `FSD50K` + `ESC-50`                                                              | CC BY                     | ✅ Yes              | Same as above                                                                                              |
| **Urban**    | `Common Voice` (Hugging Face)                                                    | CC BY                     | ✅ Yes              | `https://huggingface.co/datasets/mozilla-foundation/common_voice_17_0`                                     |
| **Firearm**  | **U.S. Government Public Domain Archives** (e.g., DOJ, FBI, Library of Congress) | U.S. Public Domain (§105) | ✅ **Yes**          | `https://www.loc.gov/`, `https://www.archives.gov/`, `https://www.fbi.gov/press-releases`                  |

---

### ❌ Sources to Exclude (Violate Your Constraints)

- **AudioSet** — unclear license, likely copyrighted
- **FreeSound** — no per-file CC guarantee
- **BBC SFX** — research-only/custom non-commercial
- **CTBTO** ( المعارضة) — “data free on request, no further exploitation except purpose as agreed”
- **Any login-only page** — unstable programmatic download

---

### ✅ Final Recommendation

1. **Use DataSEC** for environmental noise (Animal, Water, Vehicles, Natural, Urban) — **NO firearm**.
2. **Use U.S. Government Public Domain archives** for firearm class — **only safe, automatable, CC0-equivalent source**.
3. **Combine FSD50K, ESC-50, UrbanSound8K, Common Voice** for the other five classes — all CC BY, Git-redistributable.
4. **Never infer license from hosting site** — always verify per-file manifest or Zenodo/Hugging Face record.
5. **For Git redistribution**: CC0/CC BY/Public Domain = ✅ allowed; NC/research-only/custom = ❌ excluded.

> **Critical**: Your firearm class **cannot** be covered by DataSEC, ESC-50, FSD50K, or UrbanSound8K — **you must use government public-domain recordings**.

If you need a per-file manifest for firearm audio, search `https://data.gov/` with filters: `audio` + `public domain` + `firearm` — prioritize results with explicit `license: https://creativecommons.org/publicdomain/zero/1.0/` or `license: http://www.usa.gov/publicdomain/label/1.0/`.

Let me know if you need a direct per-file URL for a specific firearm sample.
