#!/usr/bin/env python3
"""Materialize vetted real-only fv1-S2 classes. Owner: Ozhegov."""

from __future__ import annotations

import argparse
import csv
import io
import json
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "docs" / "datasets" / "samples" / ".cache"
sys.path.insert(0, str(CACHE / "fv1-python"))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from remotezip import RemoteZip  # noqa: E402

DATASET = ROOT / "docs" / "datasets" / "free-v1"
TARGET_RATE = 48_000
TARGET_SECONDS = 5
TARGET_SAMPLES = TARGET_RATE * TARGET_SECONDS


def mono(samples: np.ndarray) -> np.ndarray:
    if samples.ndim == 1:
        return samples.astype(np.float32)
    return samples.mean(axis=1).astype(np.float32)


def resample(samples: np.ndarray, source_rate: int) -> np.ndarray:
    if source_rate == TARGET_RATE:
        return samples
    target_length = round(len(samples) * TARGET_RATE / source_rate)
    source_x = np.linspace(0.0, 1.0, len(samples), endpoint=False)
    target_x = np.linspace(0.0, 1.0, target_length, endpoint=False)
    return np.interp(target_x, source_x, samples).astype(np.float32)


def normalize_clip(samples: np.ndarray, source_rate: int, offset_seconds: float = 0.0) -> np.ndarray:
    samples = resample(mono(samples), source_rate)
    start = min(round(offset_seconds * TARGET_RATE), max(0, len(samples) - TARGET_SAMPLES))
    clip = samples[start : start + TARGET_SAMPLES]
    if len(clip) < TARGET_SAMPLES:
        clip = np.pad(clip, (0, TARGET_SAMPLES - len(clip)))
    peak = float(np.max(np.abs(clip))) if len(clip) else 0.0
    if peak > 0.98:
        clip = clip * (0.98 / peak)
    return clip


def reset_class(name: str) -> Path:
    output = DATASET / name
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    return output


def materialize_speech() -> None:
    source = CACHE / "fv1-s2-real" / "librispeech" / "LibriSpeech" / "dev-clean"
    candidates: list[Path] = []
    speakers: set[str] = set()
    for path in sorted(source.rglob("*.flac")):
        speaker = path.relative_to(source).parts[0]
        if speaker in speakers:
            continue
        if sf.info(path).duration < TARGET_SECONDS:
            continue
        speakers.add(speaker)
        candidates.append(path)
        if len(candidates) == 22:
            break
    if len(candidates) < 22:
        raise RuntimeError(f"LibriSpeech yielded only {len(candidates)} eligible speakers")

    output = reset_class("speech")
    metadata = []
    for index, path in enumerate(candidates, 1):
        samples, rate = sf.read(path, dtype="float32", always_2d=False)
        clip = normalize_clip(samples, rate, max(0.0, (len(samples) / rate - TARGET_SECONDS) / 2))
        file_name = f"speech-{index:03d}-a.wav"
        sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
        relative = path.relative_to(source).as_posix()
        metadata.append(
            {
                "file": file_name,
                "source": "OpenSLR SLR12 LibriSpeech dev-clean",
                "sourceUrl": "https://www.openslr.org/12",
                "license": "CC-BY-4.0",
                "duration": TARGET_SECONDS,
                "sampleRate": TARGET_RATE,
                "quality": "a",
                "background": "clean-read-speech",
                "provenance": "real",
                "originalFile": relative,
                "speakerId": relative.split("/")[0],
                "notes": "Five-second center crop from a distinct LibriSpeech speaker.",
            }
        )
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"speech: {len(metadata)} real clips")


def materialize_gunshot(source: Path) -> None:
    archive = zipfile.ZipFile(source) if source.is_file() else None
    if archive:
        names = [name for name in archive.namelist() if name.lower().endswith(".wav")]
        preferred = [name for name in names if "_chan" not in name]
        candidates = preferred or names
    else:
        candidates = sorted(source.rglob("*.wav"))
    if not candidates:
        raise RuntimeError(f"No WAV files found under {source}")

    by_firearm: dict[str, list] = {}
    for candidate in candidates:
        parts = Path(candidate).parts
        firearm = parts[1] if len(parts) > 2 else "unknown"
        by_firearm.setdefault(firearm, []).append(candidate)
    selected = []
    firearm_names = sorted(by_firearm)
    cursor = 0
    while len(selected) < 19:
        firearm = firearm_names[cursor % len(firearm_names)]
        rows = by_firearm[firearm]
        row_index = cursor // len(firearm_names)
        if row_index < len(rows):
            selected.append(rows[row_index])
        cursor += 1

    output = reset_class("gunshot")
    metadata = []
    for index, path in enumerate(selected, 1):
        if archive:
            samples, rate = sf.read(io.BytesIO(archive.read(path)), dtype="float32", always_2d=False)
            original_file = path
        else:
            samples, rate = sf.read(path, dtype="float32", always_2d=False)
            original_file = path.relative_to(source).as_posix()
        duration = len(samples) / rate
        clip = normalize_clip(samples, rate, max(0.0, (duration - TARGET_SECONDS) / 2))
        file_name = f"gunshot-{index:03d}-a.wav"
        sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
        metadata.append(
            {
                "file": file_name,
                "source": "Kabealo and Wyatt Gunshot/Gunfire Audio Dataset",
                "sourceUrl": "https://doi.org/10.5281/zenodo.6836032",
                "license": "CC-BY-4.0",
                "duration": TARGET_SECONDS,
                "sampleRate": TARGET_RATE,
                "quality": "a",
                "background": "outdoor-firearm-range",
                "provenance": "real",
                "originalFile": original_file,
                "firearmClass": Path(original_file).parts[1],
                "notes": "Real firearm-range recording; normalized to mono PCM16/48 kHz.",
            }
        )
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    if archive:
        archive.close()
    print(f"gunshot: {len(metadata)} real clips across {len(set(row['firearmClass'] for row in metadata))} firearm classes")


def materialize_birds() -> None:
    labels_path = CACHE / "fv1-s2-real" / "BirdVox-DCASE-20k_labels.csv"
    with labels_path.open(newline="", encoding="utf-8-sig") as handle:
        selected = [row["itemid"] for row in csv.DictReader(handle) if row["hasbird"] == "1"][:22]
    if len(selected) != 22:
        raise RuntimeError(f"BirdVox labels yielded only {len(selected)} positive clips")

    url = "https://zenodo.org/records/1208080/files/BirdVox-DCASE-20k.zip?download=1"
    output = reset_class("birds")
    metadata = []
    with RemoteZip(url) as archive:
        for index, item_id in enumerate(selected, 1):
            archive_path = f"wav/{item_id}.wav"
            payload = archive.read(archive_path)
            samples, rate = sf.read(io.BytesIO(payload), dtype="float32", always_2d=False)
            clip = normalize_clip(samples, rate, 0.0)
            file_name = f"birds-{index:03d}-a.wav"
            sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
            metadata.append(
                {
                    "file": file_name,
                    "source": "BirdVox-DCASE-20k",
                    "sourceUrl": "https://doi.org/10.5281/zenodo.1208080",
                    "labelsUrl": "https://ndownloader.figshare.com/files/10853300",
                    "license": "CC-BY-4.0",
                    "duration": TARGET_SECONDS,
                    "sampleRate": TARGET_RATE,
                    "quality": "a",
                    "background": "outdoor-night-bird-vocalization",
                    "provenance": "real",
                    "originalFile": archive_path,
                    "hasbird": 1,
                    "notes": "Positive BirdVox label; first five seconds of the ten-second field recording.",
                }
            )
            print(f"birds: {index}/22 {item_id}")
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


def materialize_wind() -> None:
    url = "https://zenodo.org/records/6687982/files/wind_noise_dataset.zip?download=1"
    output = reset_class("wind")
    metadata = []
    with RemoteZip(url) as archive:
        selected = [
            row.filename for row in archive.infolist()
            if row.filename.startswith("mobilephone_wind_noise/normal_wind/")
            and row.filename.lower().endswith(".wav")
        ][:22]
        for index, archive_path in enumerate(selected, 1):
            samples, rate = sf.read(io.BytesIO(archive.read(archive_path)), dtype="float32", always_2d=False)
            clip = normalize_clip(samples, rate, 0.0)
            file_name = f"wind-{index:03d}-a.wav"
            sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
            metadata.append(
                {
                    "file": file_name,
                    "source": "Wind Noise Dataset mobilephone normal_wind",
                    "sourceUrl": "https://doi.org/10.5281/zenodo.6687982",
                    "license": "CC-BY-4.0",
                    "duration": TARGET_SECONDS,
                    "sampleRate": TARGET_RATE,
                    "quality": "a",
                    "background": "mobilephone-recorded-normal-wind",
                    "provenance": "real",
                    "originalFile": archive_path,
                    "notes": "Real mobile-phone wind recording; artificial_wind_noise subtree excluded.",
                }
            )
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"wind: {len(metadata)} real clips")


def materialize_machine_hum() -> None:
    url = "https://zenodo.org/records/15340689/files/PT_DATASET_250314.zip?download=1"
    prefixes = [
        "PT_DATASET_250314/Vehicle idling/",
        "PT_DATASET_250314/Vacuum cleaner fan and hairdryer/",
        "PT_DATASET_250314/Workshop/",
    ]
    output = reset_class("machine-hum")
    metadata = []
    with RemoteZip(url) as archive:
        grouped = {
            prefix: [
                row.filename for row in archive.infolist()
                if row.filename.startswith(prefix) and row.filename.lower().endswith(".wav")
            ]
            for prefix in prefixes
        }
        selected = []
        cursor = 0
        while len(selected) < 25:
            prefix = prefixes[cursor % len(prefixes)]
            rows = grouped[prefix]
            row_index = cursor // len(prefixes)
            if row_index < len(rows):
                selected.append(rows[row_index])
            cursor += 1
        for index, archive_path in enumerate(selected, 1):
            samples, rate = sf.read(io.BytesIO(archive.read(archive_path)), dtype="float32", always_2d=False)
            clip = normalize_clip(samples, rate, 0.0)
            file_name = f"machine-hum-{index:03d}-a.wav"
            sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
            source_class = Path(archive_path).parts[1]
            metadata.append(
                {
                    "file": file_name,
                    "source": "DataSEC",
                    "sourceUrl": "https://doi.org/10.5281/zenodo.15340689",
                    "license": "CC-BY-4.0",
                    "duration": TARGET_SECONDS,
                    "sampleRate": TARGET_RATE,
                    "quality": "a",
                    "background": source_class,
                    "provenance": "real",
                    "originalFile": archive_path,
                    "notes": "Authentic non-synthesized DataSEC machine recording.",
                }
            )
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"machine-hum: {len(metadata)} real clips")


def materialize_silence() -> None:
    labels_path = CACHE / "fv1-s2-real" / "BirdVox-DCASE-20k_labels.csv"
    with labels_path.open(newline="", encoding="utf-8-sig") as handle:
        negatives = [row["itemid"] for row in csv.DictReader(handle) if row["hasbird"] == "0"][:96]
    url = "https://zenodo.org/records/1208080/files/BirdVox-DCASE-20k.zip?download=1"
    candidates = []
    with RemoteZip(url) as archive:
        for item_id in negatives:
            archive_path = f"wav/{item_id}.wav"
            payload = archive.read(archive_path)
            samples, rate = sf.read(io.BytesIO(payload), dtype="float32", always_2d=False)
            clip = normalize_clip(samples, rate, 0.0)
            rms = float(np.sqrt(np.mean(np.square(clip))))
            candidates.append((rms, item_id, clip, archive_path))
    selected = sorted(candidates, key=lambda row: row[0])[:20]
    output = reset_class("silence")
    metadata = []
    for index, (rms, item_id, clip, archive_path) in enumerate(selected, 1):
        file_name = f"silence-{index:03d}-a.wav"
        sf.write(output / file_name, clip, TARGET_RATE, subtype="PCM_16")
        metadata.append(
            {
                "file": file_name,
                "source": "BirdVox-DCASE-20k quiet negative subset",
                "sourceUrl": "https://doi.org/10.5281/zenodo.1208080",
                "labelsUrl": "https://ndownloader.figshare.com/files/10853300",
                "license": "CC-BY-4.0",
                "duration": TARGET_SECONDS,
                "sampleRate": TARGET_RATE,
                "quality": "a",
                "background": "quiet-outdoor-night-ambience",
                "provenance": "real",
                "originalFile": archive_path,
                "hasbird": 0,
                "selectionRms": rms,
                "notes": "Selected among 96 hasbird=0 field recordings by lowest five-second RMS.",
            }
        )
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"silence: {len(metadata)} real quiet-ambient clips; max RMS={selected[-1][0]:.6f}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "class_name",
        choices=["speech", "gunshot", "birds", "wind", "machine-hum", "silence"],
    )
    parser.add_argument("--source", type=Path)
    args = parser.parse_args()
    if args.class_name == "speech":
        materialize_speech()
    elif args.class_name == "birds":
        materialize_birds()
    elif args.class_name == "wind":
        materialize_wind()
    elif args.class_name == "machine-hum":
        materialize_machine_hum()
    elif args.class_name == "silence":
        materialize_silence()
    elif args.source:
        materialize_gunshot(args.source.resolve())
    else:
        parser.error("gunshot requires --source <extracted-directory>")


if __name__ == "__main__":
    main()
