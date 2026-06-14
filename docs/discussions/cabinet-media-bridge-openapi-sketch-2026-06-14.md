# Cabinet ↔ Media API — OpenAPI sketch (NB3)

> Черновик контрактов для night build `cabinet-mp4-hardening-night-build`. Не заменяет live Swagger в `background-media`; фиксирует пути, которые cabinet уже использует через `background-cabinet`.

## Два слоя

| Слой | Base URL | Auth | Потребитель |
|------|----------|------|-------------|
| **Cabinet BFF** | `{CABINET_API}/v1` | Session cookie (`SessionGuard`) | `apps/cabinet` |
| **Media data-plane** | `{MEDIA_API}/v1` | `X-Membrana-Token` (server-to-server) | `MediaBridgeService` в `background-cabinet` |

Cabinet **не** ходит в media напрямую за pairing/quota; браузер получает `mediaApiUrl` + `mediaToken` из session endpoint и дальше использует `@membrana/media-library-service`.

---

## Cabinet BFF (`background-cabinet`)

```yaml
openapi: 3.1.0
info:
  title: Membrana Cabinet Sample Library BFF
  version: 0.1.0-draft
paths:
  /v1/membranes/{membraneId}/nodes:
    get:
      summary: Paired nodes + quota summary per device
      security: [{ sessionCookie: [] }]
      parameters:
        - name: membraneId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Node list
          content:
            application/json:
              schema:
                type: object
                properties:
                  nodes:
                    type: array
                    items:
                      $ref: '#/components/schemas/MembraneNodeLibrary'

  /v1/membranes/{membraneId}/catalog:
    get:
      summary: Membrane-wide catalog (dataset samples)
      security: [{ sessionCookie: [] }]
      parameters:
        - name: membraneId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MembraneCatalog'

  /v1/media/session:
    get:
      summary: Media credentials + paired devices for browser client
      security: [{ sessionCookie: [] }]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MediaSession'
        '404':
          description: Membrane not paired / missing context

components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: membrana_session
  schemas:
    MediaSession:
      type: object
      required: [mediaApiUrl, mediaToken, membraneId, catalogId, devices]
      properties:
        mediaApiUrl: { type: string, format: uri }
        mediaToken: { type: string }
        membraneId: { type: string }
        catalogId: { type: string }
        devices:
          type: array
          items:
            type: object
            required: [nodeId, nodeLabel, deviceId]
            properties:
              nodeId: { type: string }
              nodeLabel: { type: string }
              deviceId: { type: string }
    MembraneCatalog:
      type: object
      properties:
        catalogId: { type: string }
        sampleCount: { type: integer }
        sourceDeviceId: { type: string, nullable: true }
        samples:
          type: array
          items:
            $ref: '#/components/schemas/MembraneCatalogSample'
    MembraneCatalogSample:
      type: object
      properties:
        id: { type: string }
        title: { type: string }
        class: { type: string }
        label: { type: string }
        durationSec: { type: number }
        sampleRate: { type: integer }
        sizeBytes: { type: integer }
        createdAt: { type: string, format: date-time }
    MembraneNodeLibrary:
      type: object
      properties:
        id: { type: string }
        label: { type: string }
        deviceId: { type: string, nullable: true }
        paired: { type: boolean }
        quota:
          nullable: true
          type: object
```

Источник DTO: `packages/background-cabinet/src/modules/sample-library/sample-library.dto.ts`.

---

## Media bridge (server → `background-media`)

Реализация: `packages/background-cabinet/src/modules/pair/media-bridge.service.ts`.

```yaml
openapi: 3.1.0
info:
  title: Membrana Media API (cabinet bridge subset)
  version: 0.1.0-draft
servers:
  - url: '{mediaApiUrl}/v1'
    variables:
      mediaApiUrl:
        default: http://localhost:3010
paths:
  /devices:
    post:
      summary: Register device (pairing)
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, kind]
              properties:
                name: { type: string }
                kind: { type: string, enum: [other] }
                membrane:
                  $ref: '#/components/schemas/MediaMembraneContext'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MediaDeviceRegistration'

  /devices/{deviceId}/membrane:
    patch:
      summary: Sync membrane quotas + dataset catalog id
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
        - name: deviceId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [membrane]
              properties:
                membrane:
                  $ref: '#/components/schemas/MediaMembraneContext'
      responses:
        '204': { description: OK }

  /devices/{deviceId}/collections/ensure-reserved:
    post:
      summary: Idempotent reserved collections (buffer, tariff dataset)
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
        - name: deviceId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200': { description: OK (best-effort on pair) }

  /devices/{deviceId}/quota:
    get:
      summary: Storage + buffer + dataset counters
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
        - name: deviceId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MediaQuotaResponse'

  /devices/{deviceId}/collections:
    get:
      summary: List collections for device
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
        - name: deviceId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MediaCollectionSummary'

  /devices/{deviceId}/collections/{collectionId}/samples:
    get:
      summary: List samples in collection
      parameters:
        - $ref: '#/components/parameters/MembranaToken'
        - name: deviceId
          in: path
          required: true
          schema: { type: string }
        - name: collectionId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MediaSampleSummary'

components:
  parameters:
    MembranaToken:
      name: X-Membrana-Token
      in: header
      required: true
      schema: { type: string }
  schemas:
    MediaMembraneContext:
      type: object
      required: [membraneId, userStorageQuotaBytes, bufferQuotaBytes, datasetCatalogId]
      properties:
        membraneId: { type: string }
        userStorageQuotaBytes: { oneOf: [{ type: string }, { type: number }] }
        bufferQuotaBytes: { oneOf: [{ type: string }, { type: number }] }
        datasetCatalogId: { type: string }
    MediaDeviceRegistration:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        kind: { type: string }
        createdAt: { type: string, format: date-time }
    MediaQuotaResponse:
      type: object
      properties:
        userStorage:
          $ref: '#/components/schemas/MediaQuotaBucket'
        buffer:
          $ref: '#/components/schemas/MediaQuotaBucket'
        dataset:
          type: object
          properties:
            catalogId: { type: string }
            sampleCount: { type: integer }
    MediaQuotaBucket:
      type: object
      properties:
        usedBytes: { type: integer }
        limitBytes: { type: integer }
        backend: { type: string, enum: [server] }
    MediaCollectionSummary:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        kind: { type: string }
        systemKey: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    MediaSampleSummary:
      type: object
      properties:
        id: { type: string }
        collectionId: { type: string }
        title: { type: string }
        class: { type: string }
        label: { type: string }
        source: { type: string }
        durationSec: { type: number }
        sampleRate: { type: integer }
        channels: { type: integer, enum: [1, 2] }
        storageRef: { type: string }
        sizeBytes: { type: integer }
        createdAt: { type: string, format: date-time }
        notes: { type: string }
```

---

## Следующие шаги (вне NB3)

1. Сгенерировать shared types из одного OpenAPI (`packages/core` или `@membrana/media-library-service`) — отдельный PR.
2. Подключить `@nestjs/swagger` в `background-media` и экспортировать `/api-json`.
3. Contract tests: cabinet e2e против mock media по этим path.
