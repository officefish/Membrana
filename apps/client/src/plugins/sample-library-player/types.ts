export const SAMPLE_LIBRARY_PLAYER_PLUGIN_ID = 'sample-library-player';

export interface SampleLibraryPlayerPluginConfig {
  readonly showMetadata: boolean;
}

export const defaultSampleLibraryPlayerConfig: SampleLibraryPlayerPluginConfig = {
  showMetadata: true,
};

export function resolveSampleLibraryPlayerConfig(
  raw: unknown,
): SampleLibraryPlayerPluginConfig {
  if (!raw || typeof raw !== 'object') {
    return defaultSampleLibraryPlayerConfig;
  }
  const o = raw as Partial<SampleLibraryPlayerPluginConfig>;
  return {
    showMetadata:
      typeof o.showMetadata === 'boolean'
        ? o.showMetadata
        : defaultSampleLibraryPlayerConfig.showMetadata,
  };
}
