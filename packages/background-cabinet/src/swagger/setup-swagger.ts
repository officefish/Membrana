import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfig } from '../config/env.schema';
import { API_TOKEN_SECURITY } from '../common/swagger/openapi.constants';

export function isSwaggerEnabled(config: AppConfig): boolean {
  return config.SWAGGER_ENABLED;
}

export function buildSwaggerDocument(app: INestApplication, config: AppConfig) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('@membrana/background-cabinet')
    .setDescription('Identity and domain API: users, sessions, membranes, nodes, keys')
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
    .addTag('Auth', 'User registration and sessions')
    .addTag('Membranes', 'User membrane, nodes, and access keys')
    .addTag('Pairing', 'Field node pairing with the cabinet')
    .addTag('Journal', 'Telemetry reports, live records, and journal items')
    .addTag('Journal plugins', 'Journal plugin host state')
    .addTag('Chart list selections', 'Generated chart-list selections')
    .addTag('Sample library', 'Cabinet sample-library bridge')
    .addTag('Node capture', 'Exclusive node capture state')
    .addTag('Node liveness', 'Node link-state and health pings')
    .addTag('Tariffs', 'Tariff transitions and promo redemption')
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

export function mountSwagger(app: INestApplication, config: AppConfig): void {
  const document = buildSwaggerDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
