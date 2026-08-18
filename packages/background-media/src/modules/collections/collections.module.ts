import { Module } from '@nestjs/common';
import { AudioModule } from '../../audio/audio.module';
import { BlobModule } from '../../blob/blob.module';
import { DevicesModule } from '../devices/devices.module';
import { CatalogProvisionService } from './catalog-provision.service';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionsPluginHostService } from './plugin-host.service';

@Module({
  imports: [DevicesModule, BlobModule, AudioModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, CatalogProvisionService, CollectionsPluginHostService],
  exports: [CollectionsService, CatalogProvisionService, CollectionsPluginHostService],
})
export class CollectionsModule {}
