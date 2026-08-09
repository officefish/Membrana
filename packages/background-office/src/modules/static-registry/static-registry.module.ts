import type { DynamicModule, FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { Module } from '@nestjs/common';

import { StaticRegistryController } from './static-registry.controller';
import {
  STATIC_REGISTRY_READ_PORT,
  type StaticRegistryReadPort,
} from './static-registry-read.port';

export interface StaticRegistryModuleOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly inject?: FactoryProvider<StaticRegistryReadPort>['inject'];
  readonly useFactory: FactoryProvider<StaticRegistryReadPort>['useFactory'];
}

@Module({})
export class StaticRegistryModule {
  static register(options: StaticRegistryModuleOptions): DynamicModule {
    return {
      module: StaticRegistryModule,
      imports: options.imports ?? [],
      controllers: [StaticRegistryController],
      providers: [
        {
          provide: STATIC_REGISTRY_READ_PORT,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
      ],
    };
  }
}
