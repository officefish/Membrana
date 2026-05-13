import React from 'react';
import type { PluginSidebarDetailsArgs } from '@membrana/agenda';
import { MIC_STREAM_VIZ_PLUGIN_ID, StreamVizPluginWidgetRadios } from './plugins/microphone-stream-viz';

export function renderPluginSidebarDetails(args: PluginSidebarDetailsArgs) {
  if (args.pluginId === MIC_STREAM_VIZ_PLUGIN_ID) {
    return <StreamVizPluginWidgetRadios moduleId={args.moduleId} />;
  }
  return null;
}
