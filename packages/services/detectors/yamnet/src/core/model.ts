/**
 * ND1 — загрузка и прогон YAMNet (TF.js graph-model) из бандленных артефактов.
 *
 * Среда-агностично: сюда приходят уже прочитанные `model.json` + бинарь весов
 * (node читает fs, браузер — fetch бандла). Загрузка через `tf.io.fromMemory` —
 * без сети и без файловых IO-хендлеров tfjs-node (офлайн-гарантия free-тарифа).
 */

import * as tf from '@tensorflow/tfjs';

import { YAMNET_NUM_CLASSES } from './scoring.js';

/** Прочитанные артефакты graph-model (источник чтения — забота вызывающего). */
export interface YamnetModelArtifacts {
  /** Содержимое model.json (распарсенное). */
  readonly modelJson: {
    readonly modelTopology: object;
    readonly weightsManifest: ReadonlyArray<{
      readonly paths: readonly string[];
      readonly weights: readonly object[];
    }>;
  };
  /** Шарды весов в порядке weightsManifest[].paths, склеенные или по одному. */
  readonly weightShards: readonly ArrayBuffer[];
}

export interface YamnetInference {
  /** score-кадры: Float32Array длиной frameCount×521. */
  readonly frameScores: Float32Array;
  readonly frameCount: number;
}

/** Обёртка над tf.GraphModel: прогон волны 16 кГц → покадровые score. */
export class YamnetModel {
  private constructor(private readonly graph: tf.GraphModel) {}

  static async fromArtifacts(artifacts: YamnetModelArtifacts): Promise<YamnetModel> {
    const weightSpecs = artifacts.modelJson.weightsManifest.flatMap(
      (group) => group.weights,
    ) as tf.io.WeightsManifestEntry[];
    const weightData = concatBuffers(artifacts.weightShards);
    const graph = await tf.loadGraphModel(
      tf.io.fromMemory({
        modelTopology: artifacts.modelJson.modelTopology,
        weightSpecs,
        weightData,
      }),
    );
    return new YamnetModel(graph);
  }

  /** Инференс: волна float32 @16 кГц → score [frameCount×521]. */
  async infer(waveform: Float32Array): Promise<YamnetInference> {
    const input = tf.tensor1d(waveform);
    try {
      // У графа три выхода: Identity:0 = scores [−1×521], Identity_1:0 = эмбеддинги,
      // Identity_2:0 = mel-спектрограмма. Запрашиваем scores явно — дефолтный
      // порядок выходов не гарантирует их первыми.
      const output = this.graph.execute(input, 'Identity:0') as tf.Tensor | tf.Tensor[];
      const scores = Array.isArray(output) ? output[0]! : output;
      try {
        // P2 ревью ND1: валидируем ранг явно — при не-2D деструктуризация дала бы
        // undefined без внятной диагностики.
        if (scores.shape.length !== 2 || scores.shape[1] !== YAMNET_NUM_CLASSES) {
          throw new Error(`Неожиданный выход YAMNet: ${scores.shape.join('×')}`);
        }
        const frameCount = scores.shape[0]!;
        const data = (await scores.data()) as Float32Array;
        return { frameScores: data, frameCount: frameCount ?? 0 };
      } finally {
        if (Array.isArray(output)) output.forEach((t) => t.dispose());
        else output.dispose();
      }
    } finally {
      input.dispose();
    }
  }

  dispose(): void {
    this.graph.dispose();
  }
}

function concatBuffers(buffers: readonly ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    out.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return out.buffer;
}
