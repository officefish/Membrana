import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';

const validReport = {
  generatedAt: '2026-07-06T13:16:57.973Z',
  datasetVersion: 'v2',
  sampleCount: 120,
  detectors: [
    {
      name: 'yamnet',
      family: 'neural',
      status: 'benchmarked',
      metrics: {
        tp: 55,
        fp: 22,
        fn: 5,
        tn: 38,
        precision: 0.714,
        recall: 0.917,
        f1: 0.803,
        latencyP50Ms: 97.1,
        latencyP95Ms: 132.0,
      },
    },
    { name: 'clap', family: 'neural', status: 'scaffold' },
  ],
};

function controller() {
  return new BenchmarkController(new BenchmarkService());
}

describe('BenchmarkController', () => {
  it('happy-path: POST report → GET summary с провенансом ingestedAt', () => {
    const c = controller();
    expect(c.ingest(validReport)).toEqual({ ok: true });
    const out = c.summary();
    expect(out.report.datasetVersion).toBe('v2');
    expect(out.report.detectors[0]?.metrics?.f1).toBe(0.803);
    expect(typeof out.ingestedAt).toBe('string');
  });

  it('scaffold-детектор без metrics валиден', () => {
    const c = controller();
    expect(c.ingest(validReport)).toEqual({ ok: true });
    expect(c.summary().report.detectors[1]?.metrics).toBeUndefined();
  });

  it('perSample (сырьё) отклоняется 400 — data-минимизация Q3', () => {
    const c = controller();
    const leaky = {
      ...validReport,
      detectors: [
        {
          ...validReport.detectors[0],
          perSample: [{ id: 'drone-dad-0030', truthDrone: true, predDrone: true }],
        },
      ],
    };
    expect(() => c.ingest(leaky)).toThrow(BadRequestException);
  });

  it('мусорная форма → 400, пустой office → 404', () => {
    const c = controller();
    expect(() => c.ingest({ datasetVersion: 'v2' })).toThrow(BadRequestException);
    expect(() => c.summary()).toThrow(NotFoundException);
  });
});
