# free-v1 S2 Verified Source Manifest

| Class | Count | Source | License | Selection |
|---|---:|---|---|---|
| silence | 20 | BirdVox-DCASE-20k | CC BY 4.0 | 20 lowest-RMS clips among 96 `hasbird=0` field recordings |
| wind | 22 | Wind Noise Dataset | CC BY 4.0 | `mobilephone_wind_noise/normal_wind`; artificial subtree excluded |
| birds | 22 | BirdVox-DCASE-20k | CC BY 4.0 | Official `hasbird=1` labels |
| speech | 22 | LibriSpeech `dev-clean` | CC BY 4.0 | Distinct speakers; five-second center crop |
| machine-hum | 25 | DataSEC | CC BY 4.0 | Vehicle idling, fan/hairdryer, workshop classes |
| gunshot | 19 | Gunshot/Gunfire Audio Dataset | CC BY 4.0 | Real firearm range; four firearm classes |

## Primary records

- LibriSpeech: <https://www.openslr.org/12>
- BirdVox-DCASE-20k: <https://doi.org/10.5281/zenodo.1208080>
- Bird labels: <https://ndownloader.figshare.com/files/10853300>
- Wind Noise Dataset: <https://doi.org/10.5281/zenodo.6687982>
- DataSEC: <https://doi.org/10.5281/zenodo.15340689>
- Gunshot/Gunfire Audio Dataset: <https://doi.org/10.5281/zenodo.6836032>

Every `metadata.json` row retains the source URL, license, original archive path,
normalization parameters, and class-specific selection evidence.
