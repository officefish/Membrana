import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfig } from '../config/env.schema';
import { API_TOKEN_SECURITY } from '../common/swagger/openapi.constants';

export function isSwaggerEnabled(config: AppConfig): boolean {
  return config.SWAGGER_ENABLED;
}

export function buildSwaggerDocument(app: INestApplication, config: AppConfig) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('@membrana/background-media')
    .setDescription('Web data-plane: sample library, trends templates, device-scoped storage')
    .setVersion(config.APP_VERSION || '0.1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Membrana-Token',
        in: 'header',
        description: 'Internal API token (API_INTERNAL_TOKEN)',
      },
      API_TOKEN_SECURITY,
    )
    .addTag('Health', 'Server health check')
    .addTag('Devices', 'Field node registration')
    .addTag('Collections', 'Sample collections per device')
    .addTag('Samples', 'Audio sample upload and blobs')
    .addTag('Trends templates', 'User trends templates JSON')
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

export function mountSwagger(app: INestApplication, config: AppConfig): void {
  const document = buildSwaggerDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
