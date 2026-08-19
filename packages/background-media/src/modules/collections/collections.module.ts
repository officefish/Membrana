import { Module } from '@nestjs/common';
import { AudioModule } from '../../audio/audio.module';
import { BlobModule } from '../../blob/blob.module';
import { DevicesModule } from '../devices/devices.module';
import { PluginResultsBridgeModule } from '../plugin-results-bridge/plugin-results-bridge.module';
import { CatalogProvisionService } from './catalog-provision.service';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { FirstWavePluginsRegistrar } from './first-wave.registrar';
import { CollectionsPluginHostService } from './plugin-host.service';

@Module({
  imports: [DevicesModule, BlobModule, AudioModule, PluginResultsBridgeModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, CatalogProvisionService, CollectionsPluginHostService, FirstWavePluginsRegistrar],
  exports: [CollectionsService, CatalogProvisionService, CollectionsPluginHostService],
})
export class CollectionsModule {}
