/**
 * Зубы словаря — по пунктам «Готово, когда» PR-1 (#1961): `isPluginId` (три сегмента, точки,
 * отказ на `mfcc-detector`), закрытость `PLUGIN_TRIGGERS`, discriminated union родов,
 * `HOME_REGISTRY` с двумя ключами. Плюс типовые зубы: база — ровно пять полей, `enabled`/`label`
 * не существуют, витринных полей у handler/report физически нет (M5′ DoD).
 *
 * Типовые проверки — через `expectTypeOf` и условные типы, вычисляемые в `true`: они падают
 * на `tsc`, а не в рантайме, и это ровно то, что обещает вердикт («проверяется типовой системой»).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  HOME_REGISTRY,
  PLUGIN_KINDS,
  PLUGIN_RESULTS_COLLECTION,
  PLUGIN_RESULTS_DB,
  PLUGIN_TRIGGERS,
  isHomeName,
  isPluginId,
  isPluginKind,
  isPluginTrigger,
  type HandlerManifest,
  type HomeName,
  type IPluginHost,
  type PluginId,
  type PluginManifest,
  type PluginTrigger,
  type ReportManifest,
  type RunAddress,
  type ShowcaseManifest,
} from './index.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

describe('PluginId — <org>.<kind>.<slug>', () => {
  it('принимает пример вердикта и дефис со второго сегмента', () => {
    expect(isPluginId('membrana.handler.mfcc')).toBe(true);
    expect(isPluginId('membrana.showcase.zone-map')).toBe(true);
    expect(isPluginId('org1.report.a2')).toBe(true);
  });

  it('отказывает на «mfcc-detector» и на любом числе сегментов, кроме трёх', () => {
    expect(isPluginId('mfcc-detector')).toBe(false);
    expect(isPluginId('membrana.mfcc')).toBe(false);
    expect(isPluginId('membrana.handler.mfcc.v2')).toBe(false);
  });

  it('отказывает на дефисе в org, заглавных, ведущей цифре, пустом сегменте, не-строке', () => {
    expect(isPluginId('mem-brana.handler.mfcc')).toBe(false);
    expect(isPluginId('Membrana.handler.mfcc')).toBe(false);
    expect(isPluginId('membrana.1handler.mfcc')).toBe(false);
    expect(isPluginId('membrana..mfcc')).toBe(false);
    expect(isPluginId(42)).toBe(false);
    expect(isPluginId(undefined)).toBe(false);
  });

  it('сырая строка в PluginId не проходит — брендирование несущее', () => {
    expectTypeOf<string>().not.toMatchTypeOf<PluginId>();
    expectTypeOf<PluginId>().toMatchTypeOf<string>();
  });
});

describe('HOME_REGISTRY — два дома длинной формы', () => {
  it('ровно два ключа', () => {
    expect(Object.keys(HOME_REGISTRY).sort()).toEqual([
      'background-media/collections',
      'background-office/journal',
    ]);
    expectTypeOf<HomeName>().toEqualTypeOf<'background-office/journal' | 'background-media/collections'>();
  });

  it('чужой адрес отвергается до рантайма', () => {
    expect(isHomeName('background-office/journal')).toBe(true);
    expect(isHomeName('background-devices/devices')).toBe(false);
    expect(isHomeName('journal')).toBe(false);
    expect(isHomeName('toString')).toBe(false);
  });

  it('константы дома результатов — рядом с реестром, не внутри него (A3-6)', () => {
    expect(PLUGIN_RESULTS_DB).toBe('background-office');
    expect(PLUGIN_RESULTS_COLLECTION).toBe('plugin-results');
    expect(Object.keys(HOME_REGISTRY)).not.toContain(PLUGIN_RESULTS_COLLECTION);
  });
});

describe('PLUGIN_TRIGGERS — закрытый словарь первой волны', () => {
  it('ровно три повода формы <дом>.<событие>', () => {
    expect(Object.values(PLUGIN_TRIGGERS).sort()).toEqual([
      'collections.collection_created',
      'collections.sample_added',
      'journal.entry_created',
    ]);
    expectTypeOf<PluginTrigger>().toEqualTypeOf<
      'journal.entry_created' | 'collections.collection_created' | 'collections.sample_added'
    >();
  });

  it('произвольная строка — не повод', () => {
    expect(isPluginTrigger('journal.entry_created')).toBe(true);
    expect(isPluginTrigger('journal.entry_deleted')).toBe(false);
    expect(isPluginTrigger('')).toBe(false);
  });
});

describe('PluginManifest — discriminated union родов', () => {
  it('три рода, и только они', () => {
    expect([...PLUGIN_KINDS]).toEqual(['handler', 'report', 'showcase']);
    expect(isPluginKind('showcase')).toBe(true);
    expect(isPluginKind('widget')).toBe(false);
    expectTypeOf<PluginManifest['kind']>().toEqualTypeOf<'handler' | 'report' | 'showcase'>();
  });

  it('база — РОВНО пять полей, шестого нет; enabled/label не существуют', () => {
    // Общие ключи юниона и есть база: то, что есть у КАЖДОГО рода.
    type CommonKeys = keyof PluginManifest;
    const fiveFields: Equal<CommonKeys, 'id' | 'version' | 'kind' | 'mountTarget' | 'triggers'> =
      true;
    expect(fiveFields).toBe(true);
    const noEnabled: Equal<Extract<keyof PluginManifest, 'enabled' | 'label'>, never> = true;
    expect(noEnabled).toBe(true);
    // И ни у одного рода по отдельности их нет.
    const noEnabledAnywhere: Equal<
      Extract<keyof HandlerManifest | keyof ReportManifest | keyof ShowcaseManifest, 'enabled' | 'label'>,
      never
    > = true;
    expect(noEnabledAnywhere).toBe(true);
  });

  it('windowSize — только у handler; displayForm/description — только у showcase (M3′, M5′)', () => {
    expectTypeOf<HandlerManifest>().toHaveProperty('windowSize');
    expectTypeOf<ReportManifest>().not.toHaveProperty('windowSize');
    expectTypeOf<ShowcaseManifest>().not.toHaveProperty('windowSize');

    expectTypeOf<ShowcaseManifest>().toHaveProperty('displayForm');
    expectTypeOf<HandlerManifest>().not.toHaveProperty('displayForm');
    expectTypeOf<ReportManifest>().not.toHaveProperty('displayForm');
    expectTypeOf<HandlerManifest>().not.toHaveProperty('description');
    expectTypeOf<ReportManifest>().not.toHaveProperty('description');
  });

  it('narrowing по kind сужает до типа рода — канал чтения витрины (M5′)', () => {
    const list: ReadonlyArray<PluginManifest> = [];
    for (const m of list) {
      if (m.kind === 'showcase') expectTypeOf(m).toEqualTypeOf<ShowcaseManifest>();
      if (m.kind === 'handler') expectTypeOf(m).toEqualTypeOf<HandlerManifest>();
      if (m.kind === 'report') expectTypeOf(m).toEqualTypeOf<ReportManifest>();
    }
    expectTypeOf<ReturnType<IPluginHost['getRegisteredPlugins']>>().toEqualTypeOf<
      ReadonlyArray<PluginManifest>
    >();
  });

  it('DisplayForm — пять форм плюс лазейка x-…', () => {
    const forms: ShowcaseManifest['displayForm'][] = ['row', 'table', 'zone-map', 'histogram', 'time-series', 'x-radar'];
    expect(forms).toHaveLength(6);
    // @ts-expect-error — форма вне словаря и без префикса x- не проходит
    const bad: ShowcaseManifest['displayForm'] = 'radar';
    expect(bad).toBe('radar');
  });
});

describe('RunAddress — пять полей, дом явным полем (M3′)', () => {
  it('состав ровно из pluginId · version · collectionId · runId · mountTarget', () => {
    const five: Equal<keyof RunAddress, 'pluginId' | 'version' | 'collectionId' | 'runId' | 'mountTarget'> =
      true;
    expect(five).toBe(true);
    expectTypeOf<RunAddress['mountTarget']>().toEqualTypeOf<HomeName>();
    expectTypeOf<RunAddress['pluginId']>().toEqualTypeOf<PluginId>();
  });
});

describe('IPluginHost — шесть членов, без Nest', () => {
  it('состав из M2 + M4 + M5′', () => {
    const members: Equal<
      keyof IPluginHost,
      'mountTargetId' | 'registerPlugin' | 'getRegisteredPlugins' | 'notify' | 'request' | 'setPluginEnabled'
    > = true;
    expect(members).toBe(true);
    // A4-2 / M5′: branded PluginId в сигнатурах, не сырая строка.
    expectTypeOf<Parameters<IPluginHost['request']>[0]>().toEqualTypeOf<PluginId>();
    expectTypeOf<Parameters<IPluginHost['setPluginEnabled']>[0]>().toEqualTypeOf<PluginId>();
  });
});
